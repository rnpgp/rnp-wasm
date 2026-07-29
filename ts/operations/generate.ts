import type { Ffi } from "../ffi.js";
import type { RnpGenerateOpHandle } from "../module-types.js";
import { Key } from "../key.js";
import { Handle } from "../handle.js";
import { Curves, HashAlgorithms, SymmetricAlgorithms, PublicKeyAlgorithms } from "../registry/algorithm.js";
import { INTERNAL_TOKEN } from "../internal-brand.js";

export interface GenerateOptions {
  bits?: number; curve?: string; hash?: string; userId?: string;
  usage?: readonly string[]; expirationSeconds?: number;
  protection?: { password: string; cipher?: string; hash?: string; iterations?: number; mode?: string; };
  v6?: boolean;
}

export class GenerateOperation extends Handle<RnpGenerateOpHandle> {
  private constructor(handle: RnpGenerateOpHandle) { super(handle); }

  static create(ffi: Ffi, algorithm: string): GenerateOperation {
    return new GenerateOperation(
      ffi.module_(INTERNAL_TOKEN).rnpGenerateKeyCreate(ffi.raw_(INTERNAL_TOKEN), PublicKeyAlgorithms.lookup(algorithm)),
    );
  }

  static createSubkey(ffi: Ffi, primary: Key, algorithm: string): GenerateOperation {
    return new GenerateOperation(
      ffi.module_(INTERNAL_TOKEN).rnpGenerateSubkeyCreate(ffi.raw_(INTERNAL_TOKEN), primary.raw, PublicKeyAlgorithms.lookup(algorithm)),
    );
  }

  bits(n: number): this { this.raw.setBits(n); return this; }
  curve(name: string): this { this.raw.setCurve(Curves.lookup(name)); return this; }
  hash(name: string): this { this.raw.setHash(HashAlgorithms.lookup(name)); return this; }
  userId(uid: string): this { this.raw.setUserid(uid); return this; }
  addUsage(u: string): this { this.raw.addUsage(u); return this; }
  clearUsage(): this { this.raw.clearUsage(); return this; }
  expiration(seconds: number): this { this.raw.setExpiration(seconds); return this; }
  v6(): this { this.raw.setV6Key(); return this; }

  protection(password: string, opts: { cipher?: string; hash?: string; iterations?: number; mode?: string; } = {}): this {
    if (opts.cipher) this.raw.setProtectionCipher(SymmetricAlgorithms.lookup(opts.cipher));
    if (opts.hash) this.raw.setProtectionHash(HashAlgorithms.lookup(opts.hash));
    if (opts.iterations) this.raw.setProtectionIterations(opts.iterations);
    if (opts.mode) this.raw.setProtectionMode(opts.mode);
    this.raw.setProtectionPassword(password);
    return this;
  }

  execute(): Key { this.raw.execute(); return new Key(this.raw.getKey()); }

  static rsa(ffi: Ffi, bits: number, userId?: string): GenerateOperation {
    const op = GenerateOperation.create(ffi, "RSA").bits(bits);
    if (userId) op.userId(userId);
    return op;
  }
  static ecdsa(ffi: Ffi, curve: string, userId?: string): GenerateOperation {
    const op = GenerateOperation.create(ffi, "ECDSA").curve(curve);
    if (userId) op.userId(userId);
    return op;
  }
  static eddsa(ffi: Ffi, userId?: string): GenerateOperation {
    // EDDSA implies Ed25519 — rnp_op_generate_set_curve returns BAD_PARAMETERS
    // for EDDSA/X25519 (pk_alg_allows_custom_curve is false for them).
    return GenerateOperation.create(ffi, "EDDSA").userId(userId ?? "");
  }
  static x25519(ffi: Ffi, userId?: string): GenerateOperation {
    return GenerateOperation.create(ffi, "X25519").userId(userId ?? "");
  }
}
