/**
 * ts/identifier-iterator.ts
 * Async iterator over rnp identifiers (keyids, fingerprints, etc.).
 *
 * Wraps the Embind RnpIdentifierIterator handle. Iterates until rnp returns
 * nullptr (which Embind surfaces as the empty string).
 *
 * Assumption: OpenPGP identifiers (userid, keyid, fingerprint, grip) are
 * always non-empty for valid keys. If rnp ever returns an empty identifier,
 * iteration stops early. This is a theoretical concern — no known rnp key
 * produces an empty identifier.
 */

import type { RnpIdentifierIteratorHandle } from "./module-types.js";
import { Handle } from "./handle.js";

export class IdentifierIterator extends Handle<RnpIdentifierIteratorHandle>
  implements AsyncIterable<string> {

  constructor(handle: RnpIdentifierIteratorHandle) {
    super(handle);
  }

  // Marked async for parity with AsyncIterable<string>; rnp's underlying
  // iterator is synchronous, so no actual await is needed.
  // eslint-disable-next-line @typescript-eslint/require-await
  async *[Symbol.asyncIterator](): AsyncIterator<string> {
    while (this.isAlive) {
      const next = this.raw.next();
      // Embind returns "" when the C++ side returns std::string() (nullptr from rnp).
      // See AUDIT.md C3 for the theoretical ambiguity.
      if (next === "") return;
      yield next;
    }
  }
}

