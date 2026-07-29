import { describe, it, expect } from "vitest";
import { rnp, fixture } from "./setup.js";
import {
  SignOperation, VerifyOperation,
} from "../../ts/index.js";

describe("sign + verify round-trip", () => {
  it("binary mode: signs and verifies", () => {
    const ffi = rnp().createFfi();
    try {
      const f = fixture();
      const keyring = ffi.keyring;
      using sk = ffi.input(f.secretKeyBytes);
      using pk = ffi.input(f.publicKeyBytes);
      keyring.load("GPG", sk);
      keyring.load("GPG", pk);

      const signer = keyring.mustLocate("userid", f.userid);
      signer.unlock(f.passphrase);

      const message = new TextEncoder().encode("hello rnp-wasm");
      using input = ffi.input(message);
      using output = ffi.output();
      using op = SignOperation.create(ffi, input, output, "binary")
        .addSignature(signer, { hash: "SHA-256" });
      op.execute();
      const signed = output.bytes();

      using vIn = ffi.input(signed);
      using vOut = ffi.output();
      using vOp = VerifyOperation.create(ffi, vIn, vOut);
      const result = vOp.execute();

      expect(result.signatures.length).toBeGreaterThan(0);
      expect(result.signatures[0]!.valid).toBe(true);
      signer.destroy();
    } finally {
      ffi.destroy();
    }
  });

  it("detects tampered message", () => {
    const ffi = rnp().createFfi();
    try {
      const f = fixture();
      const keyring = ffi.keyring;
      using sk = ffi.input(f.secretKeyBytes);
      using pk = ffi.input(f.publicKeyBytes);
      keyring.load("GPG", sk);
      keyring.load("GPG", pk);
      const signer = keyring.mustLocate("userid", f.userid);
      signer.unlock(f.passphrase);

      const message = new TextEncoder().encode("hello rnp-wasm");
      using input = ffi.input(message);
      using output = ffi.output();
      using op = SignOperation.create(ffi, input, output, "binary").addSignature(signer);
      op.execute();
      const signed = output.bytes();

      const tampered = signed.slice();
      const mid = Math.floor(tampered.length / 2);
      tampered[mid] = tampered[mid]! ^ 0xff;

      using vIn = ffi.input(tampered);
      using vOut = ffi.output();
      using vOp = VerifyOperation.create(ffi, vIn, vOut);
      const result = vOp.execute();
      expect(result.signatures[0]!.valid).toBe(false);
      signer.destroy();
    } finally {
      ffi.destroy();
    }
  });

  it("cleartext mode produces ASCII output", () => {
    const ffi = rnp().createFfi();
    try {
      const f = fixture();
      const keyring = ffi.keyring;
      using sk = ffi.input(f.secretKeyBytes);
      keyring.load("GPG", sk);
      const signer = keyring.mustLocate("userid", f.userid);
      signer.unlock(f.passphrase);

      const message = new TextEncoder().encode("cleartext message");
      using input = ffi.input(message);
      using output = ffi.output();
      using op = SignOperation.create(ffi, input, output, "cleartext").addSignature(signer);
      op.execute();
      const signed = output.bytes();
      const text = new TextDecoder().decode(signed);
      expect(text).toMatch(/-----BEGIN PGP SIGNED MESSAGE-----/);
      signer.destroy();
    } finally {
      ffi.destroy();
    }
  });

  it("detached mode: sign produces signature, verify takes message+signature", () => {
    const ffi = rnp().createFfi();
    try {
      const f = fixture();
      const keyring = ffi.keyring;
      using sk = ffi.input(f.secretKeyBytes);
      using pk = ffi.input(f.publicKeyBytes);
      keyring.load("GPG", sk);
      keyring.load("GPG", pk);
      const signer = keyring.mustLocate("userid", f.userid);
      signer.unlock(f.passphrase);

      const message = new TextEncoder().encode("detached sign me");
      using input = ffi.input(message);
      using output = ffi.output();
      using op = SignOperation.create(ffi, input, output, "detached").addSignature(signer);
      op.execute();
      const signature = output.bytes();

      // Verify: message + detached signature.
      using mIn = ffi.input(message);
      using sIn = ffi.input(signature);
      using vOp = VerifyOperation.createDetached(ffi, mIn, sIn);
      const result = vOp.execute();
      expect(result.signatures[0]!.valid).toBe(true);
      signer.destroy();
    } finally {
      ffi.destroy();
    }
  });
});
