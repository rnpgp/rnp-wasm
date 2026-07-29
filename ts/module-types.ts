/**
 * ts/module-types.ts
 * Minimal type declarations for the Embind-generated module surface.
 *
 * Embind's actual output is a JS class hierarchy; we type only the surface
 * we touch. Names match the EMSCRIPTEN_BINDINGS blocks in src/cpp/bindings/*.cpp.
 */

export interface RnpModule {
  // Top-level free functions
  rnpVersionString(): string;
  rnpVersionStringFull(): string;
  rnpVersion(): number;
  rnpVersionCommitTimestamp(): bigint;
  rnpSupportsFeature(type: string, name: string): boolean;
  rnpSupportedFeatures(type: string): string;  // JSON string
  rnpCalculateIterations(hash: string, msec: bigint): number;
  rnpBootstrapFeatures(): string;  // JSON document with all supported features

  // IO
  RnpInputHandle: {
    fromBytes(ptr: number, len: number): RnpInputHandle;
  };
  RnpOutputHandle: {
    toBytes(): RnpOutputHandle;
  };
  rnpEnarmor(input: RnpInputHandle, output: RnpOutputHandle, type: string): void;
  rnpDearmor(input: RnpInputHandle, output: RnpOutputHandle): void;
  rnpGuessContents(input: RnpInputHandle): string;

  // FFI lifecycle
  RnpFfiHandle: {
    create(pubFormat: string, secFormat: string): RnpFfiHandle;
  };

  // Identifier iterator
  RnpIdentifierIterator: object;
  rnpIdentifierIteratorCreate(ffi: RnpFfiHandle, itemType: string): RnpIdentifierIteratorHandle;

  // Streaming Input/Output (sync callback variant)
  RnpStreamInput: {
    create(reader: (buf: Uint8Array) => number | null): RnpStreamInputHandle;
  };
  RnpStreamOutput: {
    create(writer: (chunk: Uint8Array) => boolean): RnpStreamOutputHandle;
  };

  // Keyring
  rnpLoadKeys(ffi: RnpFfiHandle, format: string, input: RnpInputHandle, flags: number): void;
  rnpUnloadKeys(ffi: RnpFfiHandle, flags: number): void;
  rnpImportKeys(ffi: RnpFfiHandle, input: RnpInputHandle, flags: number): string;
  rnpImportSignatures(ffi: RnpFfiHandle, input: RnpInputHandle, flags: number): string;
  rnpSaveKeys(ffi: RnpFfiHandle, format: string, output: RnpOutputHandle, flags: number): void;
  rnpPublicKeyCount(ffi: RnpFfiHandle): number;
  rnpSecretKeyCount(ffi: RnpFfiHandle): number;
  rnpLocateKey(ffi: RnpFfiHandle, idType: string, id: string): RnpKeyHandle | null;

  // Operations
  rnpGenerateKeyCreate(ffi: RnpFfiHandle, alg: string): RnpGenerateOpHandle;
  rnpGenerateSubkeyCreate(ffi: RnpFfiHandle, primary: RnpKeyHandle, alg: string): RnpGenerateOpHandle;
  rnpGenerateKeyJson(ffi: RnpFfiHandle, json: string): string;

  rnpOpSignCreate(ffi: RnpFfiHandle, input: RnpInputHandle, output: RnpOutputHandle): RnpSignOpHandle;
  rnpOpSignCleartextCreate(ffi: RnpFfiHandle, input: RnpInputHandle, output: RnpOutputHandle): RnpSignOpHandle;
  rnpOpSignDetachedCreate(ffi: RnpFfiHandle, input: RnpInputHandle, output: RnpOutputHandle): RnpSignOpHandle;

  rnpOpVerifyCreate(ffi: RnpFfiHandle, input: RnpInputHandle, output: RnpOutputHandle): RnpVerifyOpHandle;
  rnpOpVerifyDetachedCreate(ffi: RnpFfiHandle, input: RnpInputHandle, signature: RnpInputHandle): RnpVerifyOpHandle;

  rnpOpEncryptCreate(ffi: RnpFfiHandle, input: RnpInputHandle, output: RnpOutputHandle): RnpEncryptOpHandle;
  rnpDecrypt(ffi: RnpFfiHandle, input: RnpInputHandle, output: RnpOutputHandle): void;  // rnp 0.18.1: one-shot, no op

  rnpDumpPacketsToJson(input: RnpInputHandle, flags: number): string;
  rnpDumpPacketsToOutput(input: RnpInputHandle, output: RnpOutputHandle, flags: number): void;

  // HEAP access (registered via EXPORTED_RUNTIME_METHODS)
  HEAPU8: Uint8Array;
  HEAPU32: Uint32Array;
  _malloc(size: number): number;
  _free(ptr: number): void;
}

export interface RnpFfiHandle {
  setPasswordProvider(cb: (keyFprint: string, pgpContext: string) => string): void;
  setKeyProvider(cb: () => void): void;
  setTimestamp(t: bigint): void;
  _id(): number;
  _destroy(): void;
}

export interface RnpIdentifierIteratorHandle {
  next(): string;  // empty string signals exhaustion
  _destroy(): void;
}

// StreamInput/StreamOutput are Embind subclasses of Input/Output (via
// class_<..., base<...>> in src/cpp/bindings/stream.cpp). The TS interfaces
// mirror that hierarchy so AnyInput/AnyOutput unions accept either.
// RnpStreamInputHandle re-exports RnpInputHandle's shape verbatim.
export type RnpStreamInputHandle = RnpInputHandle;
export interface RnpStreamOutputHandle extends RnpOutputHandle {
  finish(): void;
}

export interface RnpInputHandle {
  _destroy(): void;
}
export interface RnpOutputHandle {
  bytes(): Uint8Array;
  _destroy(): void;
}

export interface RnpKeyHandle {
  fingerprint(): string;
  keyid(): string;
  grip(): string;
  primaryGrip(): string;
  primaryFingerprint(): string;
  version(): number;
  alg(): string;
  bits(): number;
  dsaQbits(): number;
  curve(): string;
  creation(): number;
  expiration(): number;
  setExpiration(e: number): void;
  isValid(): boolean;
  validTill64(): bigint;
  isRevoked(): boolean;
  isExpired(): boolean;
  isLocked(): boolean;
  lock(): void;
  unlock(password: string): void;
  isProtected(): boolean;
  protect(password: string, cipher: string, hash: string, iterations: number): void;
  unprotect(password: string): void;
  protectionType(): string;
  protectionCipher(): string;
  protectionHash(): string;
  protectionIterations(): number;
  isPrimary(): boolean;
  isSub(): boolean;
  haveSecret(): boolean;
  havePublic(): boolean;
  subkeyCount(): number;
  subkeyAt(idx: number): RnpKeyHandle;
  primaryUid(): string;
  uidCount(): number;
  uidAt(idx: number): string;
  packetsToJson(flags: number): string;
  export(out: RnpOutputHandle, flags: number): void;
  exportAutocrypt(out: RnpOutputHandle, subkey: RnpKeyHandle | null, userid: string, flags: number): void;
  exportRevocation(out: RnpOutputHandle, flags: number, hash: string, code: string, text: string): void;
  revoke(flags: number, hash: string, code: string, text: string): void;
  remove(flags: number): void;
  addUid(uid: string, hash: string, expiration: number, keyFlags: number, primary: boolean): void;
  revocationReason(): string;  // empty if not revoked
  _destroy(): void;
}

export interface RnpGenerateOpHandle {
  setBits(b: number): RnpGenerateOpHandle;
  setHash(h: string): RnpGenerateOpHandle;
  setDsaQbits(q: number): RnpGenerateOpHandle;
  setCurve(c: string): RnpGenerateOpHandle;
  setProtectionPassword(p: string): RnpGenerateOpHandle;
  setRequestPassword(r: boolean): RnpGenerateOpHandle;
  setProtectionCipher(c: string): RnpGenerateOpHandle;
  setProtectionHash(h: string): RnpGenerateOpHandle;
  setProtectionIterations(i: number): RnpGenerateOpHandle;
  setProtectionMode(m: string): RnpGenerateOpHandle;
  addUsage(u: string): RnpGenerateOpHandle;
  clearUsage(): RnpGenerateOpHandle;
  setUserid(u: string): RnpGenerateOpHandle;
  setExpiration(e: number): RnpGenerateOpHandle;
  setV6Key(): RnpGenerateOpHandle;
  execute(): void;
  getKey(): RnpKeyHandle;
  _destroy(): void;
}

export interface RnpSignOpHandle {
  addSignature(k: RnpKeyHandle, hash: string, creation: number, expiration: number): void;
  setArmor(a: boolean): void;
  setCompression(alg: string, level: number): void;
  setHash(h: string): void;
  setCreationTime(t: bigint): void;
  setExpirationTime(t: number): void;
  setFileName(n: string): void;
  setFileMtime(t: bigint): void;
  execute(): void;
  _destroy(): void;
}

export interface RnpVerifyOpHandle {
  signatureCount(): number;
  signatureAt(idx: number): RnpVerifySigHandle;
  execute(): void;
  _destroy(): void;
}

export interface RnpVerifySigHandle {
  status(): number;  // rnp_result_t
  hashAlg(): string;
  sigAlg(): string;
  signerKeyid(): string;
  creation(): number;
  expiration(): number;
  // No _destroy — per-sig handle is owned by parent op.
}

export interface RnpEncryptOpHandle {
  addRecipient(k: RnpKeyHandle): void;
  addPassword(pw: string, s2k_hash: string, iterations: number, s2k_cipher: string): void;
  setArmor(a: boolean): void;
  setCipher(c: string): void;
  setHash(h: string): void;
  setCompression(alg: string, level: number): void;
  setAead(a: string): void;
  setCreationTime(t: bigint): void;
  setExpirationTime(t: number): void;
  setFileName(n: string): void;
  setFileMtime(t: bigint): void;
  execute(): void;
  _destroy(): void;
}

export interface RnpSignatureHandle {
  type(): string;
  alg(): string;
  hashAlg(): string;
  creation(): number;
  expiration(): number;
  keyFlags(): number;
  primaryUid(): boolean;
  keyid(): string;
  keyFprint(): string;
  signer(): string;
  revoker(): string;
  revocationReason(): string;
  trustLevel(): number;
  subpacketCount(): number;
  errorCount(): number;
  errorAt(idx: number): string;
  isValid(flags: number): boolean;
  packetToJson(flags: number): string;
  _destroy(): void;
}

export interface RnpUidHandle {
  type(): number;
  data(): string;
  isPrimary(): boolean;
  isValid(): boolean;
  isRevoked(): boolean;
  signatureCount(): number;
  signatureAt(idx: number): RnpSignatureHandle;
  _destroy(): void;
}

// Removed: rnp 0.18.1 has no rnp_op_decrypt_* — only the one-shot rnp_decrypt.
// RecipientHandle and SymEncHandle don't exist for the decrypt path.
// For decryption metadata, use VerifyOperation.
