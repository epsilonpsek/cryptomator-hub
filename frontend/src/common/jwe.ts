import { base64url } from 'rfc4648';

export class ConcatKDF {
  /**
   * KDF as defined in <a href="https://doi.org/10.6028/NIST.SP.800-56Ar2">NIST SP 800-56A Rev. 2 Section 5.8.1</a> using SHA-256
   * 
   * @param z A shared secret
   * @param keyDataLen Desired key length (in bytes)
   * @param algorithmId Purpose of the derived key material
   * @param partyUInfo Public information about party U
   * @param partyVInfo Public information about party V
   * @param suppPubInfo Mutually known public information (optional)
   * @param suppPrivInfo Mutually known private information (optional)
   * @returns key data
   */
  public static async kdf(z: Uint8Array, keyDataLen: number, algorithmId: Uint8Array, partyUInfo: Uint8Array, partyVInfo: Uint8Array, suppPubInfo: Uint8Array = new Uint8Array(), suppPrivInfo: Uint8Array = new Uint8Array()): Promise<Uint8Array> {
    // AlgorithmID || PartyUInfo || PartyVInfo {|| SuppPubInfo }{|| SuppPrivInfo }
    const otherInfo = new Uint8Array([...algorithmId, ...partyUInfo, ...partyVInfo, ...suppPubInfo, ...suppPrivInfo]);
    return this.kdfInternal(z, keyDataLen, new Uint8Array(otherInfo));
  }

  private static async kdfInternal(z: Uint8Array, keyDataLen: number, otherInfo: Uint8Array): Promise<Uint8Array> {
    const hashLen = 32; // output length of SHA-256
    const reps = Math.ceil(keyDataLen / hashLen);
    if (reps >= 0xFFFFFFFF) {
      throw new Error('unsupported keyDataLen');
    }
    if (4 + z.byteLength + otherInfo.byteLength > 0xFFFFFFFF) {
      // technically max hash length for sha256 is 2^64-1 bits, but JS doesn't allow (safe) 64 bit numbers
      // it is safe to restrict this kdf to smaller input lengths
      throw new Error('unsupported input length');
    }
    const key = new Uint8Array(reps * hashLen);
    const tmp = new ArrayBuffer(4 + z.byteLength + otherInfo.byteLength);
    for (let i = 0; i < reps; i++) {
      new DataView(tmp, 0, 4).setUint32(0, i + 1, false);
      new Uint8Array(tmp).set(z, 4);
      new Uint8Array(tmp).set(otherInfo, 4 + z.byteLength);
      const digest = await crypto.subtle.digest('SHA-256', tmp);
      key.set(new Uint8Array(digest), i * hashLen);
    }
    return key.slice(0, keyDataLen);
  }
}

export class JWEHeader {
  constructor(readonly alg: string, readonly enc: string, readonly epk: JsonWebKey | null, readonly apu: string, readonly apv: string) { }
}

export class JWE {
  /**
   * Creates a JWE using ECDH-ES using the P-384 curve and AES-256-GCM for payload encryption.
   * 
   * See <a href="https://datatracker.ietf.org/doc/html/rfc7516">RFC 7516</a> + <a href="https://datatracker.ietf.org/doc/html/rfc7518#section-4.6">RFC 7518, Section 4.6</a>
   * 
   * @param payload The secret payload
   * @param devicePublicKey The recipient's public key
   * @param apu Optional public information about the producer (PartyUInfo)
   * @param apv Optional public information about the recipient (PartyVInfo)
   */
  public static async build(payload: Uint8Array, recipientPublicKey: CryptoKey, apu: Uint8Array = new Uint8Array(), apv: Uint8Array = new Uint8Array()): Promise<string> {
    /* key agreement and header params described in RFC 7518, Section 4.6: */
    const ephemeralKey = await crypto.subtle.generateKey(
      {
        name: 'ECDH',
        namedCurve: 'P-384'
      },
      false,
      ['deriveBits']
    );
    const alg = 'ECDH-ES';
    const enc = 'A256GCM';
    const epk = await crypto.subtle.exportKey('jwk', ephemeralKey.publicKey);
    const header = new JWEHeader(alg, enc, epk, base64url.stringify(apu, { pad: false }), base64url.stringify(apv, { pad: false }));

    /* JWE assembly and content encryption described in RFC 7516: */
    const encodedHeader = base64url.stringify(new TextEncoder().encode(JSON.stringify(header)), { pad: false });
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encodedIv = base64url.stringify(iv, { pad: false });
    const encodedEncryptedKey = ''; // empty for Direct Key Agreement as per spec
    const cek = await this.deriveKey(recipientPublicKey, ephemeralKey.privateKey, 384, 32, header);
    const m = new Uint8Array(await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        additionalData: new TextEncoder().encode(encodedHeader),
        tagLength: 128
      },
      cek,
      payload
    ));
    console.assert(m.byteLength > 16, 'result of GCM encryption expected to contain 128bit tag');
    const ciphertext = m.slice(0, m.byteLength - 16);
    const tag = m.slice(m.byteLength - 16);
    const encodedCiphertext = base64url.stringify(ciphertext, { pad: false });
    const encodedTag = base64url.stringify(tag, { pad: false });
    return encodedHeader + '.' + encodedEncryptedKey + '.' + encodedIv + '.' + encodedCiphertext + '.' + encodedTag;
  }

  // visible for testing
  public static async deriveKey(recipientPublicKey: CryptoKey, ephemeralSecretKey: CryptoKey, ecdhKeyBits: number, desiredKeyBytes: number, header: JWEHeader, exportable: boolean = false): Promise<CryptoKey> {
    let agreedKey = new Uint8Array();
    let derivedKey = new Uint8Array();
    try {
      const algorithmId = this.lengthPrefixed(new TextEncoder().encode(header.enc));
      const partyUInfo = this.lengthPrefixed(base64url.parse(header.apu, { loose: true }));
      const partyVInfo = this.lengthPrefixed(base64url.parse(header.apv, { loose: true }));
      const suppPubInfo = new ArrayBuffer(4);
      new DataView(suppPubInfo).setUint32(0, desiredKeyBytes * 8, false);
      agreedKey = new Uint8Array(await crypto.subtle.deriveBits(
        {
          name: 'ECDH',
          public: recipientPublicKey
        },
        ephemeralSecretKey,
        ecdhKeyBits
      ));
      derivedKey = await ConcatKDF.kdf(new Uint8Array(agreedKey), desiredKeyBytes, algorithmId, partyUInfo, partyVInfo, new Uint8Array(suppPubInfo));
      return crypto.subtle.importKey('raw', derivedKey, { name: 'AES-GCM', length: desiredKeyBytes * 8 }, exportable, ['encrypt']);
    } finally {
      derivedKey.fill(0x00);
      agreedKey.fill(0x00);
    }
  }

  private static lengthPrefixed(data: Uint8Array): Uint8Array {
    const result = new ArrayBuffer(4 + data.byteLength);
    new DataView(result, 0, 4).setUint32(0, data.byteLength, false);
    new Uint8Array(result).set(data, 4);
    return new Uint8Array(result);
  }
}
