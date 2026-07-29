/**
 * ts/providers/key.ts
 * Key provider contract. JS callback invoked by rnp when it needs to look up
 * a key for verification or decryption. Returns the key bytes (armored GPG),
 * or null if not found.
 */

import type { Ffi } from "../rnp.js";
import type { KeyIdentifierType } from "../keyring.js";

export interface KeyLookupContext {
  readonly ffi: Ffi;
  readonly identifierType: KeyIdentifierType;
  readonly identifier: string;
  readonly secret: boolean;
}

export type KeyProvider = (ctx: KeyLookupContext) => Promise<Uint8Array | null>;
