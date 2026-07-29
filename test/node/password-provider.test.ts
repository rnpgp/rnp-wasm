import { describe, it, expect } from "vitest";
import { rnp, fixture } from "./setup.js";
import {
  EncryptOperation, decrypt,
} from "../../ts/index.js";

/**
 * Cover the password provider trampoline (TODO 44 fix). The provider must be
 * invoked when rnp needs to unlock a password-protected secret key, and the
 * returned password must reach rnp correctly.
 */
describe("password provider", () => {
  it("is invoked during decrypt and returns the password", () => {
    const ffi = rnp().createFfi();
    let invoked = 0;
    ffi.setPasswordProvider(({ pgpContext, keyFingerprint }) => {
      invoked++;
      expect(typeof pgpContext).toBe("string");
      expect(keyFingerprint === undefined || typeof keyFingerprint === "string").toBe(true);
      return fixture().passphrase;
    });

    try {
      const f = fixture();
      const keyring = ffi.keyring;
      using sk = ffi.input(f.secretKeyBytes);
      using pk = ffi.input(f.publicKeyBytes);
      keyring.load("GPG", sk);
      keyring.load("GPG", pk);
      const recipient = keyring.mustLocate("userid", f.userid);

      const plaintext = new TextEncoder().encode("provider-encrypted");
      using in1 = ffi.input(plaintext);
      using out1 = ffi.output();
      using eop = EncryptOperation.create(ffi, in1, out1).addRecipient(recipient);
      eop.execute();
      const ciphertext = out1.bytes();

      using in2 = ffi.input(ciphertext);
      using out2 = ffi.output();
      decrypt(ffi, in2, out2);
      expect(out2.bytes()).toEqual(plaintext);
      expect(invoked).toBeGreaterThan(0);
      recipient.destroy();
    } finally {
      ffi.destroy();
    }
  });

  it("provider returning null aborts the operation", () => {
    const ffi = rnp().createFfi();
    ffi.setPasswordProvider(() => null);

    try {
      const f = fixture();
      const keyring = ffi.keyring;
      using sk = ffi.input(f.secretKeyBytes);
      using pk = ffi.input(f.publicKeyBytes);
      keyring.load("GPG", sk);
      keyring.load("GPG", pk);
      const recipient = keyring.mustLocate("userid", f.userid);

      const plaintext = new TextEncoder().encode("never-decrypt");
      using in1 = ffi.input(plaintext);
      using out1 = ffi.output();
      using eop = EncryptOperation.create(ffi, in1, out1).addRecipient(recipient);
      eop.execute();
      const ciphertext = out1.bytes();

      using in2 = ffi.input(ciphertext);
      using out2 = ffi.output();
      expect(() => decrypt(ffi, in2, out2)).toThrow();
      recipient.destroy();
    } finally {
      ffi.destroy();
    }
  });
});
