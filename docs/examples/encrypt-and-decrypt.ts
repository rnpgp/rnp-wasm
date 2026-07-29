/**
 * docs/examples/encrypt-and-decrypt.ts
 * Run: npx tsx docs/examples/encrypt-and-decrypt.ts
 *
 * Public-key encryption to a recipient + password-based (symmetric) encryption.
 */

import { initRnp, EncryptOperation, decrypt } from "rnp-wasm";

async function main() {
  const rnp = await initRnp();
  using ffi = rnp.createFfi();

  // Load recipient's public + secret keys.
  const pubBytes = new Uint8Array(/* … */);
  const secBytes = new Uint8Array(/* … */);
  using pub = ffi.input(pubBytes);
  using sec = ffi.input(secBytes);
  ffi.keyring.load("GPG", pub);
  ffi.keyring.load("GPG", sec);
  const recipient = ffi.keyring.mustLocate("userid", "bob <bob@example.com>");

  const plaintext = new TextEncoder().encode("top secret");

  // ---- Public-key encryption ----
  using eIn = ffi.input(plaintext);
  using eOut = ffi.output();
  using eOp = EncryptOperation.create(ffi, eIn, eOut)
    .addRecipient(recipient)
    .cipher("AES-256")
    .aead("OCB");
  eOp.execute();
  const ciphertext = eOut.bytes();
  console.log("ciphertext bytes:", ciphertext.length, "(plaintext:", plaintext.length, ")");

  // ---- Decrypt with the matching secret key ----
  recipient.unlock("bob's passphrase");
  using dIn = ffi.input(ciphertext);
  using dOut = ffi.output();
  // rnp 0.18.1: one-shot decrypt (no recipients/symenc metadata).
  decrypt(ffi, dIn, dOut);
  console.log("plaintext matches:", new TextDecoder().decode(dOut.bytes()) === "top secret");
  recipient.destroy();

  // ---- Password-based (symmetric) encryption ----
  using pIn = ffi.input(plaintext);
  using pOut = ffi.output();
  using pOp = EncryptOperation.create(ffi, pIn, pOut)
    .addPassword("shared-password", { hash: "SHA-256", cipher: "AES-256" })
    .armor(true);
  pOp.execute();
  const armored = new TextDecoder().decode(pOut.bytes());
  console.log("password-encrypted is armored:", armored.startsWith("-----BEGIN PGP MESSAGE-----"));
}

main().catch((e) => { console.error(e); process.exit(1); });
