/**
 * ts/operations/verify.ts
 * VerifyOperation: run verification, return structured result.
 *
 * Two modes:
 *  - Inline: input is the signed/encrypted message. rnp writes verified
 *    plaintext to a caller-provided Output.
 *  - Detached: input is the message, signatureInput is the detached signature.
 *
 * Match the underlying rnp C API: rnp_op_verify_create vs
 * rnp_op_verify_detached_create.
 */

import type { Ffi } from "../ffi.js";
import type { RnpVerifyOpHandle, RnpVerifySigHandle } from "../module-types.js";
import { type AnyInput, type AnyOutput, inputNative, outputNative } from "../io.js";
import { Handle } from "../handle.js";
import { INTERNAL_TOKEN } from "../internal-brand.js";

export interface VerifiedSignature {
  valid: boolean;
  hashAlg: string;
  sigAlg: string;
  signerKeyid: string;
  creation: number;
  expiration: number;
}

export interface VerifyResult {
  signatures: VerifiedSignature[];
}

export class VerifyOperation extends Handle<RnpVerifyOpHandle> {
  private constructor(handle: RnpVerifyOpHandle) { super(handle); }

  static create(ffi: Ffi, input: AnyInput, output: AnyOutput): VerifyOperation {
    const m = ffi.module_(INTERNAL_TOKEN);
    const f = ffi.raw_(INTERNAL_TOKEN);
    const inP = inputNative(input);
    const outP = outputNative(output);
    return new VerifyOperation(m.rnpOpVerifyCreate(f, inP, outP));
  }

  static createDetached(ffi: Ffi, messageInput: AnyInput, signatureInput: AnyInput): VerifyOperation {
    const m = ffi.module_(INTERNAL_TOKEN);
    const f = ffi.raw_(INTERNAL_TOKEN);
    const mP = inputNative(messageInput);
    const sP = inputNative(signatureInput);
    return new VerifyOperation(m.rnpOpVerifyDetachedCreate(f, mP, sP));
  }

  execute(): VerifyResult {
    this.raw.execute();
    const n = this.raw.signatureCount();
    const signatures: VerifiedSignature[] = [];
    for (let i = 0; i < n; i++) {
      const sig = this.raw.signatureAt(i);
      signatures.push(mapSig(sig));
    }
    return { signatures };
  }
}

function mapSig(sig: RnpVerifySigHandle): VerifiedSignature {
  // rnp_op_verify_signature_get_status returns RNP_SUCCESS (0) only when valid.
  // Non-zero means invalid or some verification error; treat all as invalid.
  const status = sig.status();
  return {
    valid: status === 0,
    hashAlg: sig.hashAlg(),
    sigAlg: sig.sigAlg(),
    signerKeyid: sig.signerKeyid(),
    creation: sig.creation(),
    expiration: sig.expiration(),
  };
}
