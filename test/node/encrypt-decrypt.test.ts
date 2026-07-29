import { describe, it, expect } from "vitest";
import { rnp, fixture } from "./setup.js";
import {
  EncryptOperation, decrypt,
} from "../../ts/index.js";

describe("encrypt + decrypt round-trip", () => {
  it("public-key encryption with the right recipient decrypts to original", () => {
    const ffi = rnp().createFfi();
    try {
      ffi.setPasswordProvider(() => fixture().passphrase);

      const f = fixture();
      const keyring = ffi.keyring;
      using sk = ffi.input(f.secretKeyBytes);
      using pk = ffi.input(f.publicKeyBytes);
      keyring.load("GPG", sk);
      keyring.load("GPG", pk);
      const recipient = keyring.mustLocate("userid", f.userid);

      const plaintext = new TextEncoder().encode("secret message");
      using in1 = ffi.input(plaintext);
      using out1 = ffi.output();
      using eop = EncryptOperation.create(ffi, in1, out1).addRecipient(recipient);
      eop.execute();
      const ciphertext = out1.bytes();
      expect(ciphertext).not.toEqual(plaintext);

      recipient.unlock(f.passphrase);
      using in2 = ffi.input(ciphertext);
      using out2 = ffi.output();
      // rnp 0.18.1 has only the one-shot rnp_decrypt — no op-based metadata.
      decrypt(ffi, in2, out2);
      expect(out2.bytes()).toEqual(plaintext);
      recipient.destroy();
    } finally {
      ffi.destroy();
    }
  });

  it("password-based encryption round-trips", () => {
    const ffi = rnp().createFfi();
    try {
      // Sync password provider — the callback must return the string immediately
      // (async providers require the Asyncify build, see TODO 37).
      ffi.setPasswordProvider(() => "hunter2");

      const plaintext = new TextEncoder().encode("password-encrypted");
      using in1 = ffi.input(plaintext);
      using out1 = ffi.output();
      using eop = EncryptOperation.create(ffi, in1, out1)
        .addPassword("hunter2", { hash: "SHA256" });
      eop.execute();
      const ciphertext = out1.bytes();

      using in2 = ffi.input(ciphertext);
      using out2 = ffi.output();
      decrypt(ffi, in2, out2);
      expect(out2.bytes()).toEqual(plaintext);
    } finally {
      ffi.destroy();
    }
  });
});
