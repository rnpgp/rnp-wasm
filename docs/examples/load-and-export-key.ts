/**
 * docs/examples/load-and-export-key.ts
 * Run: npx tsx docs/examples/load-and-export-key.ts
 *
 * Load an armored key, inspect it, enumerate UIDs and subkeys, export it back,
 * compare fingerprints via constant-time Key.equals().
 */

import { initRnp } from "@rnpgp/rnp";

async function main() {
  const rnp = await initRnp();
  using ffi = rnp.createFfi();

  const armored = new TextEncoder().encode(/* your armored key */ "");
  using input = ffi.input(armored);
  ffi.keyring.load("GPG", input);

  // Enumerate via the identifier iterator.
  const fingerprints = await ffi.keyring.allIdentifiers("fingerprint");
  console.log("loaded fingerprints:", fingerprints);

  for (const fprint of fingerprints) {
    const key = ffi.keyring.mustLocate("fingerprint", fprint);
    try {
      console.log("---");
      console.log("fingerprint:", key.fingerprint);
      console.log("algorithm:  ", key.algorithm, "bits:", key.bits, "curve:", key.curve);
      console.log("version:    ", key.version);
      console.log("creation:   ", key.creationDate.toISOString());
      console.log("expiration: ", key.expirationDate?.toISOString() ?? "(never)");
      console.log("isRevoked:  ", key.isRevoked);
      console.log("haveSecret: ", key.haveSecret);
      console.log("havePublic: ", key.havePublic);

      console.log("UIDs:");
      for (const uid of key.userIds()) console.log("  -", uid);

      console.log("Subkeys:");
      for (const sub of key.subkeys()) {
        console.log("  -", sub.fingerprint, "curve:", sub.curve);
        sub.destroy();
      }

      // Constant-time equality check.
      console.log("equals self:    ", key.equals(key));
      console.log("hasFingerprint: ", key.hasFingerprint(fprint));

      // Export armored.
      const reExport = key.exportToBytes(ffi, { armored: true });
      console.log("exported bytes:", reExport.length);
    } finally {
      key.destroy();
    }
  }

  // Inspect the packet structure of the first key as JSON.
  if (fingerprints.length > 0) {
    const firstKey = ffi.keyring.mustLocate("fingerprint", fingerprints[0]!);
    try {
      const json = firstKey.packetsToJson(0);
      const parsed = JSON.parse(json);
      console.log("packet count:", parsed.packets?.length);
    } finally {
      firstKey.destroy();
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
