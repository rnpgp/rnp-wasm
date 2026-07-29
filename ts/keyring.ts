/**
 * ts/keyring.ts
 * Keyring operations on an FFI handle.
 */

import type { Ffi } from "./ffi.js";
import { type AnyInput, type AnyOutput, inputNative, outputNative } from "./io.js";
import { Key } from "./key.js";
import { IdentifierIterator } from "./identifier-iterator.js";
import { RnpKeyNotFoundError } from "./errors.js";
import { INTERNAL_TOKEN } from "./internal-brand.js";

export type KeyFormat = "GPG" | "KBX" | "JSON";
export type KeyIdentifierType = "userid" | "keyid" | "fingerprint" | "grip";
export type IdentifierItemType = "userid" | "keyid" | "fingerprint" | "grip";

/** Flags for rnp_load_keys / rnp_save_keys. See rnp.h:80-84. */
export const LoadSaveFlags = {
  PUBLIC_KEYS: 0x01,
  SECRET_KEYS: 0x02,
  PERMISSIVE: 0x100,
  SINGLE: 0x200,
  BASE64: 0x400,
} as const;

export interface ImportResult {
  public_keys: ReadonlyArray<{ public: string; }>;
  secret_keys: ReadonlyArray<{ secret: string; }>;
}

export class Keyring {
  constructor(private readonly ffi: Ffi) {}

  load(format: KeyFormat, input: AnyInput): void {
    this.ffi.module_(INTERNAL_TOKEN).rnpLoadKeys(this.ffi.raw_(INTERNAL_TOKEN), format, inputNative(input), LoadSaveFlags.PUBLIC_KEYS | LoadSaveFlags.SECRET_KEYS);
  }

  unload(): void {
    this.ffi.module_(INTERNAL_TOKEN).rnpUnloadKeys(this.ffi.raw_(INTERNAL_TOKEN), LoadSaveFlags.PUBLIC_KEYS | LoadSaveFlags.SECRET_KEYS);
  }

  import_(input: AnyInput): string {
    return this.ffi.module_(INTERNAL_TOKEN).rnpImportKeys(this.ffi.raw_(INTERNAL_TOKEN), inputNative(input), LoadSaveFlags.PUBLIC_KEYS | LoadSaveFlags.SECRET_KEYS);
  }

  importSignatures(input: AnyInput): string {
    return this.ffi.module_(INTERNAL_TOKEN).rnpImportSignatures(this.ffi.raw_(INTERNAL_TOKEN), inputNative(input), 0);
  }

  save(format: KeyFormat, output: AnyOutput): void {
    this.ffi.module_(INTERNAL_TOKEN).rnpSaveKeys(this.ffi.raw_(INTERNAL_TOKEN), format, outputNative(output), LoadSaveFlags.PUBLIC_KEYS | LoadSaveFlags.SECRET_KEYS);
  }

  get publicKeyCount(): number { return this.ffi.module_(INTERNAL_TOKEN).rnpPublicKeyCount(this.ffi.raw_(INTERNAL_TOKEN)); }
  get secretKeyCount(): number { return this.ffi.module_(INTERNAL_TOKEN).rnpSecretKeyCount(this.ffi.raw_(INTERNAL_TOKEN)); }

  locate(by: KeyIdentifierType, value: string): Key | null {
    const handle = this.ffi.module_(INTERNAL_TOKEN).rnpLocateKey(this.ffi.raw_(INTERNAL_TOKEN), by, value);
    return handle ? new Key(handle) : null;
  }

  mustLocate(by: KeyIdentifierType, value: string): Key {
    const k = this.locate(by, value);
    if (!k) throw new RnpKeyNotFoundError(`${by}=${value}`);
    return k;
  }

  identifiers(by: IdentifierItemType): IdentifierIterator {
    const handle = this.ffi.module_(INTERNAL_TOKEN).rnpIdentifierIteratorCreate(this.ffi.raw_(INTERNAL_TOKEN), by);
    return new IdentifierIterator(handle);
  }

  async allIdentifiers(by: IdentifierItemType): Promise<string[]> {
    const out: string[] = [];
    for await (const id of this.identifiers(by)) out.push(id);
    return out;
  }
}
