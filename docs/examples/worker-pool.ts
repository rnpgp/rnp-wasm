/**
 * docs/examples/worker-pool.ts
 * Run: npx tsx docs/examples/worker-pool.ts  (Node 22+ with Worker support)
 *
 * Off-main-thread sign + verify via WorkerPool. Each worker hosts a sticky
 * FFI + Keyring so callers can load a key once and reuse it across many
 * operations without re-loading per call.
 */

import { WorkerPool } from "rnp-wasm";

async function main() {
  const pool = new WorkerPool({ size: 4 });

  try {
    const session = pool.session();
    const init = await session.init();
    console.log("worker booted rnp version:", init.rnpVersion);

    // Configure the session password provider.
    await session.setPassphrase("alice-pw");

    // Load the secret key.
    const secretBytes = new Uint8Array(/* … armored secret key … */);
    const loaded = await session.loadKey(secretBytes);
    console.log("loaded keys (public/secret):", loaded.publicCount, loaded.secretCount);

    // Sign a message. (Replace "alice-fingerprint" with the actual fingerprint.)
    const message = new TextEncoder().encode("hello from main thread");
    const { signed } = await session.sign(message, "alice-fingerprint", { hash: "SHA-256" });
    console.log("signed bytes:", signed.length);

    // Verify it round-trips.
    const result = await session.verify(signed);
    console.log("verified signatures:", result.signatures.length);
  } finally {
    await pool.terminateAll();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
