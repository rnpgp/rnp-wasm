import type { Ffi } from "../ffi.js";
import type { RnpSignOpHandle } from "../module-types.js";
import { type AnyInput, type AnyOutput, inputNative, outputNative } from "../io.js";
import type { Key } from "../key.js";
import { Handle } from "../handle.js";
import { CompressionAlgorithms, HashAlgorithms } from "../registry/algorithm.js";
import { INTERNAL_TOKEN } from "../internal-brand.js";

export type SignMode = "binary" | "cleartext" | "detached";
export interface SignatureConfig { hash?: string; creationTime?: Date; expirationSeconds?: number; }

export class SignOperation extends Handle<RnpSignOpHandle> {
  private constructor(handle: RnpSignOpHandle) { super(handle); }

  static create(ffi: Ffi, input: AnyInput, output: AnyOutput, mode: SignMode = "binary"): SignOperation {
    const m = ffi.module_(INTERNAL_TOKEN);
    const f = ffi.raw_(INTERNAL_TOKEN);
    const inP = inputNative(input);
    const outP = outputNative(output);
    const handle = mode === "cleartext" ? m.rnpOpSignCleartextCreate(f, inP, outP)
      : mode === "detached" ? m.rnpOpSignDetachedCreate(f, inP, outP)
      : m.rnpOpSignCreate(f, inP, outP);
    return new SignOperation(handle);
  }

  addSignature(signer: Key, opts: SignatureConfig = {}): this {
    const hash = opts.hash ? HashAlgorithms.lookup(opts.hash) : "";
    const creation = opts.creationTime ? Math.floor(opts.creationTime.getTime() / 1000) : 0;
    const expiration = opts.expirationSeconds ?? 0;
    this.raw.addSignature(signer.raw, hash, creation, expiration);
    return this;
  }

  armor(a: boolean): this { this.raw.setArmor(a); return this; }
  hash(name: string): this { HashAlgorithms.lookup(name); this.raw.setHash(name); return this; }
  compression(alg: string, level: number): this { CompressionAlgorithms.lookup(alg); this.raw.setCompression(alg, level); return this; }
  creationTime(d: Date): this { this.raw.setCreationTime(Number(Math.floor(d.getTime() / 1000))); return this; }
  expirationTime(seconds: number): this { this.raw.setExpirationTime(seconds); return this; }
  fileName(name: string): this { this.raw.setFileName(name); return this; }
  fileMtime(d: Date): this { this.raw.setFileMtime(Number(Math.floor(d.getTime() / 1000))); return this; }
  execute(): void { this.raw.execute(); }
}
