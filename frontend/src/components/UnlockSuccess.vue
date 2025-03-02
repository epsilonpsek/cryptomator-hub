<template>
  <div class="max-w-7xl mx-auto sm:px-6 lg:px-8">
    <div v-if="me == null">
      <div v-if="onFetchError == null">
        {{ t('common.loading') }}
      </div>
      <div v-else>
        <FetchError :error="onFetchError" :retry="fetchData"/>
      </div>
    </div>

    <div v-else>
      <div class="pt-8 pb-4 shrink-0 flex items-center">
        <img src="/logo.svg" class="h-8" alt="Logo"/>
        <span class="font-headline font-bold text-primary ml-2 pb-px">CRYPTOMATOR HUB</span>
      </div>

      <div class="relative shadow-xl sm:rounded-2xl sm:overflow-hidden">
        <div class="absolute inset-0">
          <div class="absolute inset-0 bg-gradient-to-r from-primary-l1 to-primary mix-blend-multiply" />
        </div>
        <!-- TODO: localize-->
        <div class="relative px-4 py-16 sm:px-6 sm:py-24 lg:py-32 lg:px-8">
          <h1 class="text-center text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-white">
            Welcome back, {{ me.name }}!
          </h1>
          <div v-if="deviceState == DeviceState.Unknown" class="max-w-lg mx-auto text-center text-xl text-primary-l2 sm:max-w-3xl">
            <p class="mt-6">
              This device is unknown to Cryptomator Hub.
            </p>
            <p class="mt-3">
              Please return to Cryptomator and register your device.
            </p>
          </div>
          <div v-else-if="deviceState == DeviceState.Registered" class="max-w-lg mx-auto text-center text-xl text-primary-l2 sm:max-w-3xl">
            <p class="mt-6">
              This device is registered, but has no access to the vault.
            </p>
            <p class="mt-3">
              Please contact the vault owner to give your device access to the vault.
            </p>
          </div>
          <div v-else-if="deviceState == DeviceState.AccessDenied" class="max-w-lg mx-auto text-center text-xl text-primary-l2 sm:max-w-3xl">
            <p class="mt-6">
              You don't have access to this vault.
            </p>
            <p class="mt-3">
              Please contact the vault owner to add your account to the vault members.
            </p>
          </div>
          <div v-else class="max-w-lg mx-auto text-center text-xl text-primary-l2 sm:max-w-3xl">
            <p class="mt-6">
              Your unlock was successful.
            </p>
            <p class="mt-3">
              You can now close this page and continue using Cryptomator.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from 'vue';
import { useI18n } from 'vue-i18n';
import backend, { UserDto, VaultDto } from '../common/backend';
import FetchError from './FetchError.vue';

const { t } = useI18n({ useScope: 'global' });

const props = defineProps<{
  vaultId: string,
  deviceId: string
}>();

const deviceState = computed(() => {
  const foundDevice = me.value?.devices.find(d => d.id == props.deviceId);
  if ( accessibleVaults.value?.find(v => v.id == props.vaultId) == undefined ) {
    return DeviceState.AccessDenied;
  } else if ( foundDevice?.accessTo.find(v => v.id == props.vaultId) ) {
    return DeviceState.AccessAllowed;
  } else if ( foundDevice ) {
    return DeviceState.Registered;
  } else {
    return DeviceState.Unknown;
  }
});

enum DeviceState {
  Unknown,
  Registered,
  AccessDenied,
  AccessAllowed
}

const me = ref<UserDto>();
const accessibleVaults = shallowRef<VaultDto []>();
const onFetchError = ref<Error | null>();

onMounted(fetchData);

async function fetchData() {
  onFetchError.value = null;
  try {
    me.value = await backend.users.me(true, true);
    accessibleVaults.value = await backend.vaults.listAccessible();
  } catch (error) {
    console.error('Retrieving user information failed.', error);
    onFetchError.value = error instanceof Error ? error : new Error('Unknown Error');
  }
}
</script>
