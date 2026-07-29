/**
 * docs/examples/sign-and-verify.ts
 * Run: npx tsx docs/examples/sign-and-verify.ts
 *
 * Demonstrates binary, cleartext, and detached signing; corresponding verify
 * calls; tamper detection.
 */

import { initRnp, SignOperation, VerifyOperation, RnpError } from "rnp-wasm";

async function main() {
  const rnp = await initRnp();
  using ffi = rnp.createFfi();

  // Load a fixture keypair (replace with your own armored bytes).
  const secretBytes = new Uint8Array(/* … armored secret key … */);
  const publicBytes = new Uint8Array(/* … armored public key … */);

  using sk = ffi.input(secretBytes);
  using pk = ffi.input(publicBytes);
  ffi.keyring.load("GPG", sk);
  ffi.keyring.load("GPG", pk);

  const signer = ffi.keyring.mustLocate("userid", "alice <alice@example.com>");
  signer.unlock("passphrase");

  const message = new TextEncoder().encode("hello world");

  // ---- Binary (inline) signature ----
  {
    using input = ffi.input(message);
    using output = ffi.output();
    using op = SignOperation.create(ffi, input, output, "binary")
      .addSignature(signer, { hash: "SHA-256" })
      .creationTime(new Date());
    op.execute();
    const signed = output.bytes();

    using vIn = ffi.input(signed);
    using vOut = ffi.output();
    using vOp = VerifyOperation.create(ffi, vIn, vOut);
    const result = vOp.execute();
    console.log("binary valid:", result.signatures[0]?.valid);
  }

  // ---- Cleartext signature (ASCII output) ----
  {
    using input = ffi.input(message);
    using output = ffi.output();
    using op = SignOperation.create(ffi, input, output, "cleartext")
      .addSignature(signer);
    op.execute();
    const text = new TextDecoder().decode(output.bytes());
    console.log("cleartext starts with header:",
      text.startsWith("-----BEGIN PGP SIGNED MESSAGE-----"));
  }

  // ---- Detached signature (message + signature separate) ----
  {
    using input = ffi.input(message);
    using output = ffi.output();
    using op = SignOperation.create(ffi, input, output, "detached")
      .addSignature(signer);
    op.execute();
    const signature = output.bytes();

    using mIn = ffi.input(message);
    using sIn = ffi.input(signature);
    using vOp = VerifyOperation.createDetached(ffi, mIn, sIn);
    const result = vOp.execute();
    console.log("detached valid:", result.signatures[0]?.valid);
  }

  // ---- Tamper detection ----
  {
    using input = ffi.input(message);
    using output = ffi.output();
    using op = SignOperation.create(ffi, input, output, "binary").addSignature(signer);
    op.execute();
    const tampered = output.bytes().slice();
    tampered[Math.floor(tampered.length / 2)] ^= 0xff;

    using vIn = ffi.input(tampered);
    using vOut = ffi.output();
    using vOp = VerifyOperation.create(ffi, vIn, vOut);
    const result = vOp.execute();
    console.log("tampered detected as invalid:", !result.signatures[0]?.valid);
  }

  signer.destroy();

  // ---- Error handling ----
  try {
    ffi.keyring.mustLocate("userid", "nonexistent");
  } catch (e) {
    if (e instanceof RnpError) console.log("expected RnpError:", e.code, e.message);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
