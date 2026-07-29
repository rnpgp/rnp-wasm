import { describe, it, expect } from "vitest";
import { rnp, fixture } from "./setup.js";

describe("keyring", () => {
  it("loads a GPG secret key into an empty keyring", () => {
    const ffi = rnp().createFfi();
    try {
      const keyring = ffi.keyring;
      using input = ffi.input(fixture().secretKeyBytes);
      keyring.load("GPG", input);
      expect(keyring.secretKeyCount).toBeGreaterThan(0);
    } finally {
      ffi.destroy();
    }
  });

  it("counts public vs secret independently", () => {
    const ffi = rnp().createFfi();
    try {
      const keyring = ffi.keyring;
      using input = ffi.input(fixture().publicKeyBytes);
      keyring.load("GPG", input);
      expect(keyring.publicKeyCount).toBeGreaterThan(0);
      expect(keyring.secretKeyCount).toBe(0);
    } finally {
      ffi.destroy();
    }
  });

  it("unload clears counts", () => {
    const ffi = rnp().createFfi();
    try {
      const keyring = ffi.keyring;
      using input = ffi.input(fixture().publicKeyBytes);
      keyring.load("GPG", input);
      expect(keyring.publicKeyCount).toBeGreaterThan(0);
      keyring.unload();
      expect(keyring.publicKeyCount).toBe(0);
    } finally {
      ffi.destroy();
    }
  });
});

describe("key", () => {
  it("locates by userid and reports identity", () => {
    const ffi = rnp().createFfi();
    try {
      const keyring = ffi.keyring;
      using input = ffi.input(fixture().publicKeyBytes);
      keyring.load("GPG", input);

      const key = keyring.locate("userid", fixture().userid);
      expect(key).not.toBeNull();
      expect(key!.fingerprint).toBe(fixture().fingerprint);
      expect(key!.fingerprint).toMatch(/^[0-9a-fA-F]{40}$/);
      expect(key!.algorithm.toUpperCase()).toContain("RSA");
      expect(key!.bits).toBe(2048);
      key!.destroy();
    } finally {
      ffi.destroy();
    }
  });

  it("unlock works with correct passphrase", () => {
    const ffi = rnp().createFfi();
    try {
      const keyring = ffi.keyring;
      using input = ffi.input(fixture().secretKeyBytes);
      keyring.load("GPG", input);
      const key = keyring.mustLocate("userid", fixture().userid);
      expect(key.isLocked).toBe(true);
      key.unlock(fixture().passphrase);
      expect(key.isLocked).toBe(false);
      key.destroy();
    } finally {
      ffi.destroy();
    }
  });
});
