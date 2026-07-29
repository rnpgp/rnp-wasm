import type { Ffi } from "../ffi.js";
import type { RnpEncryptOpHandle } from "../module-types.js";
import { type AnyInput, type AnyOutput, inputNative, outputNative } from "../io.js";
import type { Key } from "../key.js";
import { Handle } from "../handle.js";
import { AeadAlgorithms, CompressionAlgorithms, HashAlgorithms, SymmetricAlgorithms } from "../registry/algorithm.js";
import { INTERNAL_TOKEN } from "../internal-brand.js";

export interface PasswordEncryptionOptions { hash?: string; cipher?: string; iterations?: number; }

export class EncryptOperation extends Handle<RnpEncryptOpHandle> {
  private constructor(handle: RnpEncryptOpHandle) { super(handle); }

  static create(ffi: Ffi, input: AnyInput, output: AnyOutput): EncryptOperation {
    return new EncryptOperation(
      ffi.module_(INTERNAL_TOKEN).rnpOpEncryptCreate(ffi.raw_(INTERNAL_TOKEN), inputNative(input), outputNative(output)),
    );
  }

  addRecipient(key: Key): this { this.raw.addRecipient(key.raw); return this; }
  addPassword(password: string, opts: PasswordEncryptionOptions = {}): this {
    const cipher = opts.cipher ? SymmetricAlgorithms.lookup(opts.cipher) : "";
    const hash = opts.hash ? HashAlgorithms.lookup(opts.hash) : "";
    this.raw.addPassword(password, hash, opts.iterations ?? 0, cipher);
    return this;
  }
  armor(a: boolean): this { this.raw.setArmor(a); return this; }
  cipher(name: string): this { this.raw.setCipher(SymmetricAlgorithms.lookup(name)); return this; }
  hash(name: string): this { this.raw.setHash(HashAlgorithms.lookup(name)); return this; }
  compression(alg: string, level: number): this { this.raw.setCompression(CompressionAlgorithms.lookup(alg), level); return this; }
  aead(name: string): this { this.raw.setAead(AeadAlgorithms.lookup(name)); return this; }
  fileName(name: string): this { this.raw.setFileName(name); return this; }
  fileMtime(d: Date): this { this.raw.setFileMtime(Number(Math.floor(d.getTime() / 1000))); return this; }
  execute(): void { this.raw.execute(); }
}
