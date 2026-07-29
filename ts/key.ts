/**
 * ts/key.ts
 * Key: high-level wrapper around the Embind RnpKeyHandle.
 *
 * Getters are lazy; mutation methods (lock/unlock/protect/export/revoke/...)
 * call rnp immediately and throw RnpError on failure.
 */

import type { RnpKeyHandle } from "./module-types.js";
import type { Output } from "./io.js";
import { Handle } from "./handle.js";
import { constantTimeEqual, hexToBytes } from "./bytes.js";
import { HashAlgorithms } from "./registry/algorithm.js";

/**
 * Flags passed to rnp_key_export. Values must match
 * `third-party/rnp/include/rnp/rnp.h` `RNP_KEY_EXPORT_*` exactly.
 *
 * Verified 2026-07-28 against rnp 0.18.1:
 *   RNP_KEY_EXPORT_ARMORED  (1U << 0) = 0x01
 *   RNP_KEY_EXPORT_PUBLIC   (1U << 1) = 0x02
 *   RNP_KEY_EXPORT_SECRET   (1U << 2) = 0x04
 *   RNP_KEY_EXPORT_SUBKEYS  (1U << 3) = 0x08
 *   RNP_KEY_EXPORT_BASE64   (1U << 9) = 0x200
 */
export const KeyExportFlags = {
  ARMORED: 0x01,
  PUBLIC:   0x02,
  SECRET:   0x04,
  SUBKEYS:  0x08,
  BASE64:   0x200,
} as const;
export type KeyExportFlags_t = typeof KeyExportFlags;

/** Reason codes for revocation (RFC 9580 §5.2.3.24). */
export type RevocationReasonCode =
  | "no"
  | "superseded"
  | "compromised"
  | "retired";

export interface KeyExportOptions {
  armored?: boolean;
  secret?: boolean;
  includeSubkeys?: boolean;
  /** Base64-encode instead of binary (for Autocrypt-style flows). */
  base64?: boolean;
}

export interface KeyRevocationOptions {
  hash?: string;
  reason?: RevocationReasonCode;
  reasonText?: string;
}

export interface AddUidOptions {
  /** Hash algorithm for the self-signature. Default: rnp-selected. */
  hash?: string;
  /** UID expiration in seconds (0 = never). */
  expirationSeconds?: number;
  /** Key usage flags (RFC 4880 §5.2.3.21). Default 0. */
  keyFlags?: number;
  /** Mark this UID as primary. Default false. */
  primary?: boolean;
}

export class Key extends Handle<RnpKeyHandle> {
  constructor(handle: RnpKeyHandle) {
    super(handle);
  }

  // ---- Identity ---------------------------------------------------------

  get fingerprint(): string { return this.raw.fingerprint(); }
  get keyid(): string { return this.raw.keyid(); }
  get grip(): string { return this.raw.grip(); }
  get primaryGrip(): string { return this.raw.primaryGrip(); }
  get primaryFingerprint(): string { return this.raw.primaryFingerprint(); }
  get version(): number { return this.raw.version(); }
  get algorithm(): string { return this.raw.alg(); }
  get bits(): number { return this.raw.bits(); }
  get curve(): string { return this.raw.curve(); }

  // ---- Lifecycle --------------------------------------------------------

  get creationDate(): Date { return new Date(this.raw.creation() * 1000); }
  get expirationDate(): Date | null {
    const s = this.raw.expiration();
    return s === 0 ? null : new Date(s * 1000);
  }
  setExpirationSeconds(seconds: number): void { this.raw.setExpiration(seconds); }

  get isValid(): boolean { return this.raw.isValid(); }
  get validTill(): Date { return new Date(Number(this.raw.validTill64()) * 1000); }
  get isRevoked(): boolean { return this.raw.isRevoked(); }
  get revocationReason(): string | null {
    const r = this.raw.revocationReason();
    return r === "" ? null : r;
  }
  get isExpired(): boolean { return this.raw.isExpired(); }

  // ---- Lock / protect ---------------------------------------------------

  get isLocked(): boolean { return this.raw.isLocked(); }
  lock(): void { this.raw.lock(); }
  unlock(password: string): void { this.raw.unlock(password); }

  get isProtected(): boolean { return this.raw.isProtected(); }
  protect(password: string, cipher: string, hash: string, iterations: number): void {
    this.raw.protect(password, cipher, hash, iterations);
  }
  unprotect(password: string): void { this.raw.unprotect(password); }

  // ---- State ------------------------------------------------------------

  get isPrimary(): boolean { return this.raw.isPrimary(); }
  get isSubkey(): boolean { return this.raw.isSub(); }
  get haveSecret(): boolean { return this.raw.haveSecret(); }
  get havePublic(): boolean { return this.raw.havePublic(); }

  // ---- Enumeration ------------------------------------------------------

  get subkeyCount(): number { return this.raw.subkeyCount(); }
  subkeyAt(idx: number): Key { return new Key(this.raw.subkeyAt(idx)); }
  *subkeys(): Iterable<Key> {
    for (let i = 0; i < this.subkeyCount; i++) yield this.subkeyAt(i);
  }

  get primaryUserId(): string { return this.raw.primaryUid(); }
  get userIdCount(): number { return this.raw.uidCount(); }
  userIdAt(idx: number): string { return this.raw.uidAt(idx); }
  *userIds(): Iterable<string> {
    for (let i = 0; i < this.userIdCount; i++) yield this.userIdAt(i);
  }

  // ---- Serialization ----------------------------------------------------

  /** Raw JSON packet dump; consumers JSON.parse if they want structure. */
  packetsToJson(flags = 0): string { return this.raw.packetsToJson(flags); }

  // ---- Export / mutation ------------------------------------------------

  /**
   * Export this key (and optionally subkeys) to the provided Output.
   * Caller is responsible for the Output lifecycle.
   */
  export(output: Output, opts: KeyExportOptions = {}): void {
    let flags = 0;
    if (opts.secret === true)       flags |= KeyExportFlags.SECRET;
    else                            flags |= KeyExportFlags.PUBLIC;
    if (opts.includeSubkeys !== false) flags |= KeyExportFlags.SUBKEYS;
    if (opts.armored === true)      flags |= KeyExportFlags.ARMORED;
    if (opts.base64 === true)       flags |= KeyExportFlags.BASE64;
    this.raw.export(output.raw, flags);
  }

  /** Convenience: export to bytes, taking an Ffi to provide the Output. */
  exportToBytes(ffi: { output(): Output }, opts: KeyExportOptions = {}): Uint8Array {
    using out = ffi.output();
    this.export(out, opts);
    return out.bytes();
  }

  /** Export as Autocrypt-compatible key material. */
  exportAutocrypt(output: Output, opts: { subkey?: Key; userid?: string; flags?: number } = {}): void {
    this.raw.exportAutocrypt(
      output.raw,
      opts.subkey ? opts.subkey.raw : null,
      opts.userid ?? "",
      opts.flags ?? 0,
    );
  }

  /** Export a revocation certificate without revoking the key. */
  exportRevocation(output: Output, opts: KeyRevocationOptions = {}): void {
    this.raw.exportRevocation(
      output.raw,
      0,
      opts.hash ? HashAlgorithms.lookup(opts.hash) : "",
      opts.reason ?? "",
      opts.reasonText ?? "",
    );
  }

  /** Revokes this key in-place. */
  revoke(opts: KeyRevocationOptions = {}): void {
    this.raw.revoke(
      0,
      opts.hash ? HashAlgorithms.lookup(opts.hash) : "",
      opts.reason ?? "",
      opts.reasonText ?? "",
    );
  }

  /** Adds a user ID to this key (rnp_key_add_uid full signature). */
  addUserId(uid: string, opts: AddUidOptions = {}): void {
    this.raw.addUid(
      uid,
      opts.hash ? HashAlgorithms.lookup(opts.hash) : "",
      opts.expirationSeconds ?? 0,
      opts.keyFlags ?? 0,
      opts.primary ?? false,
    );
  }

  /** Removes this key from its keyring. */
  remove(flags = 0): void { this.raw.remove(flags); }

  // ---- Comparison -------------------------------------------------------

  /**
   * Constant-time equality check on fingerprints. Useful for trust pinning
   * where timing side-channels matter.
   *
   * Defensive: returns `false` if either fingerprint is malformed hex (which
   * shouldn't happen with rnp-produced keys, but a hostile `other` instance
   * could supply anything).
   *
   * Note: constant-time only over the hex-byte comparison; the lookup path
   * leading here is not constant-time.
   */
  equals(other: Key): boolean {
    try {
      const a = hexToBytes(this.fingerprint);
      const b = hexToBytes(other.fingerprint);
      return constantTimeEqual(a, b);
    } catch {
      return false;
    }
  }

  /** Convenience: compare against a hex fingerprint string. Defensive. */
  hasFingerprint(hex: string): boolean {
    try {
      return constantTimeEqual(hexToBytes(this.fingerprint), hexToBytes(hex));
    } catch {
      return false;
    }
  }
}
