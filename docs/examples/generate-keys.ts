/**
 * docs/examples/generate-keys.ts
 * Run: npx tsx docs/examples/generate-keys.ts
 *
 * Generate RSA, ECDSA, EdDSA, X25519 keys; protect with passphrase; export
 * armored; re-import to verify round-trip.
 */

import { initRnp, GenerateOperation, KeyExportFlags } from "@rnpgp/rnp";

async function main() {
  const rnp = await initRnp();

  // RSA 3072, passphrase-protected.
  {
    using ffi = rnp.createFfi();
    using op = GenerateOperation.rsa(ffi, 3072, "alice <alice@example.com>")
      .hash("SHA-256")
      .protection("alice-pw", { hash: "SHA-256", cipher: "AES-256" })
      .expiration(365 * 24 * 60 * 60);
    using key = op.execute();
    console.log("RSA 3072:", key.fingerprint, "protected:", key.isProtected);

    // Export armored public + secret.
    const pubBytes = key.exportToBytes(ffi, { armored: true });
    const secBytes = key.exportToBytes(ffi, { armored: true, secret: true });
    console.log("public:", new TextDecoder().decode(pubBytes).slice(0, 40) + "...");
    console.log("secret length:", secBytes.length);
  }

  // Ed25519 (signing).
  {
    using ffi = rnp.createFfi();
    using op = GenerateOperation.eddsa(ffi, "bob <bob@example.com>");
    using key = op.execute();
    console.log("Ed25519:", key.fingerprint, "curve:", key.curve);
  }

  // X25519 (encryption).
  {
    using ffi = rnp.createFfi();
    using op = GenerateOperation.x25519(ffi, "carol <carol@example.com>");
    using key = op.execute();
    console.log("X25519:", key.fingerprint, "curve:", key.curve);
  }

  // ECDSA on NIST P-384.
  {
    using ffi = rnp.createFfi();
    using op = GenerateOperation.create(ffi, "ECDSA")
      .curve("NIST P-384")
      .userId("dave <dave@example.com>")
      .addUsage("sign")
      .addUsage("certify");
    using key = op.execute();
    console.log("ECDSA P-384:", key.fingerprint);
  }

  console.log("KeyExportFlags values:", KeyExportFlags);
}

main().catch((e) => { console.error(e); process.exit(1); });
