/**
 * ts/providers/password.ts
 * Password provider contract. JS callback invoked by rnp when a secret key
 * needs to be unlocked. Returns the password (sync string), or null to abort.
 *
 * Async providers (returning Promise<string | null>) require the Asyncify
 * build (TODO 37); on a non-Asyncify build the promise is detected and the
 * callback returns "" — see Ffi.setPasswordProvider.
 */

import type { Ffi } from "../rnp.js";

export interface PasswordContext {
  /** The Ffi the callback is bound to. */
  readonly ffi: Ffi;
  /** Hex fingerprint of the key rnp is asking about, if known. */
  readonly keyFingerprint?: string;
  /** rnp's context string ("encrypt", "decrypt", "sign", "protect", ...). */
  readonly pgpContext: string;
}

export type PasswordProvider = (ctx: PasswordContext) => string | null | Promise<string | null>;
