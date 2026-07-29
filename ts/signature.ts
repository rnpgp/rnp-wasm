/**
 * ts/signature.ts
 * Signature handle wrapper.
 */

import type { RnpSignatureHandle } from "./module-types.js";
import { Handle } from "./handle.js";

export class Signature extends Handle<RnpSignatureHandle> {
  constructor(handle: RnpSignatureHandle) { super(handle); }

  get type(): string { return this.raw.type(); }
  get algorithm(): string { return this.raw.alg(); }
  get hashAlgorithm(): string { return this.raw.hashAlg(); }
  get creationDate(): Date { return new Date(this.raw.creation() * 1000); }
  get expirationSeconds(): number { return this.raw.expiration(); }
  get keyFlags(): number { return this.raw.keyFlags(); }
  get keyid(): string { return this.raw.keyid(); }
  get keyFingerprint(): string { return this.raw.keyFprint(); }
  get signer(): string { return this.raw.signer(); }
  get revoker(): string { return this.raw.revoker(); }
  get revocationReason(): string { return this.raw.revocationReason(); }
  get trustLevel(): number { return this.raw.trustLevel(); }

  get subpacketCount(): number { return this.raw.subpacketCount(); }
  get errorCount(): number { return this.raw.errorCount(); }
  errorAt(idx: number): string { return this.raw.errorAt(idx); }

  isValid(flags = 0): boolean { return this.raw.isValid(flags); }
  packetToJson(flags = 0): string { return this.raw.packetToJson(flags); }
}
