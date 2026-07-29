/**
 * ts/operations/decrypt.ts
 *
 * rnp 0.18.1 has NO op-based decrypt API (no `rnp_op_decrypt_*`). Only the
 * one-shot `rnp_decrypt(ffi, input, output)`. For decryption metadata
 * (recipients, AEAD parameters), use VerifyOperation — rnp's verify op handles
 * both signed and encrypted messages.
 *
 * This module exposes a plain function, not a class, to honestly reflect the
 * one-shot shape. Calling it `DecryptOperation` would imply the fluent builder
 * pattern used by Sign/Verify/Encrypt/Generate, which doesn't apply here.
 */

import type { Ffi } from "../ffi.js";
import { type AnyInput, type AnyOutput, inputNative, outputNative } from "../io.js";
import { INTERNAL_TOKEN } from "../internal-brand.js";

/**
 * Decrypt `input` (encrypted OpenPGP message) and write plaintext to `output`.
 * The caller's password provider (registered on the FFI) is invoked if a
 * password-protected secret key is needed.
 *
 * @example
 * ```ts
 * using in = ffi.input(ciphertext);
 * using out = ffi.output();
 * decrypt(ffi, in, out);
 * const plaintext = out.bytes();
 * ```
 */
export function decrypt(ffi: Ffi, input: AnyInput, output: AnyOutput): void {
  ffi.module_(INTERNAL_TOKEN).rnpDecrypt(
    ffi.raw_(INTERNAL_TOKEN),
    inputNative(input),
    outputNative(output),
  );
}
