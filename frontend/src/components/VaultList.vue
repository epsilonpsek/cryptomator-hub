<template>
  <div v-if="vaults == null">
    <div v-if="onFetchError == null">
      {{ t('common.loading') }}
    </div>
    <div v-else>
      <FetchError :error="onFetchError" :retry="fetchData"/>
    </div>
  </div>

  <h2 class="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
    {{ t('vaultList.title') }}
  </h2>

  <div class="pb-5 mt-3 border-b border-gray-200 flex flex-wrap sm:flex-nowrap gap-3 items-center whitespace-nowrap">
    <input id="vaultSearch" v-model="query" :placeholder="t('vaultList.search.placeholder')" type="text" class="focus:ring-primary focus:border-primary block w-full shadow-sm text-sm border-gray-300 rounded-md disabled:bg-gray-200"/>

    <Listbox v-if="isAdmin" v-model="selectedFilter" as="div">
      <div class="relative w-32">
        <ListboxButton class="relative w-full cursor-default rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-left shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary text-sm">
          <span class="block truncate">{{ selectedFilter.name }}</span>
          <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronUpDownIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
          </span>
        </ListboxButton>
        <transition leave-active-class="transition ease-in duration-100" leave-from-class="opacity-100" leave-to-class="opacity-0">
          <ListboxOptions class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none text-sm">
            <ListboxOption v-for="filterValue in filterValues" :key="filterValue.id" v-slot="{ active, selected }" :value="filterValue" as="template" @click="filterValue.method">
              <li :class="[active ? 'text-white bg-primary' : 'text-gray-900', 'relative cursor-default select-none py-2 pl-3 pr-9']">
                <span :class="[selected ? 'font-semibold' : 'font-normal', 'block truncate']">{{ filterValue.name }}</span>

                <span v-if="selected" :class="[active ? 'text-white' : 'text-primary', 'absolute inset-y-0 right-0 flex items-center pr-4']">
                  <CheckIcon class="h-5 w-5" aria-hidden="true" />
                </span>
              </li>
            </ListboxOption>
          </ListboxOptions>
        </transition>
      </div>
    </Listbox>

    <Menu as="div" class="relative inline-block text-left">
      <div>
        <MenuButton class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-d1 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
          {{ t('vaultList.addVault') }}
          <ChevronDownIcon class="-mr-1 ml-2 h-5 w-5" aria-hidden="true" />
        </MenuButton>
      </div>

      <transition enter-active-class="transition ease-out duration-100" enter-from-class="transform opacity-0 scale-95" enter-to-class="transform opacity-100 scale-100" leave-active-class="transition ease-in duration-75" leave-from-class="transform opacity-100 scale-100" leave-to-class="transform opacity-0 scale-95">
        <MenuItems class="absolute right-0 z-10 mt-2 w-48 origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div class="py-1">
            <router-link v-slot="{ navigate }" to="/app/vaults/create">
              <MenuItem v-slot="{ active }" @click="navigate">
                <div :class="[active ? 'bg-gray-100 text-gray-900' : 'text-gray-700', 'group flex items-center px-4 py-2 text-sm']">
                  <PlusIcon class="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" aria-hidden="true" />
                  {{ t('vaultList.addVault.create') }}
                </div>
              </MenuItem>
            </router-link>
            <router-link v-slot="{ navigate }" to="/app/vaults/recover">
              <MenuItem v-slot="{ active }" @click="navigate">
                <div :class="[active ? 'bg-gray-100 text-gray-900' : 'text-gray-700', 'group flex items-center px-4 py-2 text-sm']">
                  <ArrowPathIcon class="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" aria-hidden="true" />
                  {{ t('vaultList.addVault.recover') }}
                </div>
              </MenuItem>
            </router-link>
          </div>
        </MenuItems>
      </transition>
    </Menu>
  </div>

  <div v-if="filteredVaults != null && filteredVaults.length > 0" class="mt-5 bg-white shadow overflow-hidden rounded-md">
    <ul role="list" class="divide-y divide-gray-200">
      <li v-for="(vault, index) in filteredVaults" :key="vault.masterkey">
        <a role="button" tabindex="0" class="block hover:bg-gray-50" :class="{'ring-2 ring-inset ring-primary': selectedVault == vault, 'rounded-t-md': index == 0, 'rounded-b-md': index == filteredVaults.length - 1}" @click="onVaultClick(vault)">
          <div class="px-4 py-4 flex items-center sm:px-6">
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-primary">{{ vault.name }}</p>
              <p v-if="vault.description.length > 0" class="truncate text-sm text-gray-500 mt-2">{{ vault.description }}</p>
            </div>
            <div class="ml-5 shrink-0">
              <ChevronRightIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
            </div>
          </div>
        </a>
      </li>
    </ul>
  </div>

  <div v-else-if="query === '' && filteredVaults != null && filteredVaults.length == 0" class="mt-3 text-center">
    <svg xmlns="http://www.w3.org/2000/svg" class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10.5v6m3-3H9m4.06-7.19l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
    </svg>
    <h3 class="mt-2 text-sm font-medium text-gray-900">{{ t('vaultList.empty.title') }}</h3>
    <p class="mt-1 text-sm text-gray-500">{{ t('vaultList.empty.description') }}</p>
  </div>

  <div v-else-if="query !== '' && filteredVaults != null && filteredVaults.length == 0" class="mt-3 text-center">
    <svg xmlns="http://www.w3.org/2000/svg" class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.75 15.75l-2.489-2.489m0 0a3.375 3.375 0 10-4.773-4.773 3.375 3.375 0 004.774 4.774zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    <h3 class="mt-2 text-sm font-medium text-gray-900">{{ t('vaultList.filter.result.empty.title') }}</h3>
    <p v-if="isAdmin" class="mt-1 text-sm text-gray-500">{{ t('vaultList.filter.result.empty.description.admin') }}</p>
    <p v-else class="mt-1 text-sm text-gray-500">{{ t('vaultList.filter.result.empty.description.user') }}</p>
  </div>

  <SlideOver v-if="selectedVault != null" ref="vaultDetailsSlideOver" :title="selectedVault.name" @close="selectedVault = null">
    <VaultDetails :vault-id="selectedVault.id"></VaultDetails>
  </SlideOver>
</template>

<script setup lang="ts">
import { Listbox, ListboxButton, ListboxOption, ListboxOptions, Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/vue';
import { ArrowPathIcon, ChevronDownIcon, PlusIcon } from '@heroicons/vue/20/solid';
import { CheckIcon, ChevronRightIcon, ChevronUpDownIcon } from '@heroicons/vue/24/solid';
import { computed, nextTick, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import auth from '../common/auth';
import backend, { VaultDto } from '../common/backend';
import FetchError from './FetchError.vue';
import SlideOver from './SlideOver.vue';
import VaultDetails from './VaultDetails.vue';

const { t } = useI18n({ useScope: 'global' });

const vaultDetailsSlideOver = ref<typeof SlideOver>();
const onFetchError = ref<Error | null>();

const vaults = ref<VaultDto[]>();
const selectedVault = ref<VaultDto | null>(null);

const isAdmin = ref<boolean>();

const filterValues = [
  { id: 1, name: t('vaultList.filter.entry.accessibleVaults'), method: onAccessibleVaultsClick },
  { id: 2, name: t('vaultList.filter.entry.allVaults'), method: onAllVaultsClick },
];
const selectedFilter = ref(filterValues[0]);
const query = ref('');
const filteredVaults = computed(() =>
  query.value === ''
    ? vaults.value
    : vaults.value?.filter((vault) => {
      return vault.name.toLowerCase().includes(query.value.toLowerCase());
    })
);

onMounted(fetchData);

async function fetchData() {
  onFetchError.value = null;
  try {
    vaults.value = (await backend.vaults.listAccessible()).sort((a, b) => a.name.localeCompare(b.name));
    isAdmin.value = (await auth).isAdmin();
  } catch (error) {
    console.error('Retrieving vault list failed.', error);
    onFetchError.value = error instanceof Error ? error : new Error('Unknown Error');
  }
}

function onVaultClick(vault: VaultDto) {
  selectedVault.value = vault;
  nextTick(() => vaultDetailsSlideOver.value?.show());
}

async function onAllVaultsClick() {
  vaults.value = (await backend.vaults.listAll()).sort((a, b) => a.name.localeCompare(b.name));
}

async function onAccessibleVaultsClick() {
  vaults.value = (await backend.vaults.listAccessible()).sort((a, b) => a.name.localeCompare(b.name));
}
</script>
