/**
 * ts/uid.ts
 * UID handle wrapper.
 */

import type { RnpUidHandle } from "./module-types.js";
import { Handle } from "./handle.js";

export class Uid extends Handle<RnpUidHandle> {
  constructor(handle: RnpUidHandle) { super(handle); }
  get type(): number { return this.raw.type(); }
  get data(): Uint8Array {
    // raw.data() returns UTF-8 string; we convert back to bytes if caller needs raw.
    // This is acceptable for UIDs which are always textual.
    return new TextEncoder().encode(this.raw.data());
  }
  get text(): string { return this.raw.data(); }
  get isPrimary(): boolean { return this.raw.isPrimary(); }
  get isValid(): boolean { return this.raw.isValid(); }
  get isRevoked(): boolean { return this.raw.isRevoked(); }
  get signatureCount(): number { return this.raw.signatureCount(); }
}
