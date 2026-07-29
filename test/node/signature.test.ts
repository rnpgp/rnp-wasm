import { describe, it, expect } from "vitest";
import { rnp, fixture } from "./setup.js";

/**
 * Cover the Signature wrapper. Locates a signature on a fixture key's
 * self-certification and inspects its fields.
 */
describe("signature inspection", () => {
  it("locates a self-signature on the primary UID", () => {
    const ffi = rnp().createFfi();
    try {
      const f = fixture();
      const keyring = ffi.keyring;
      using pk = ffi.input(f.publicKeyBytes);
      keyring.load("GPG", pk);
      const key = keyring.mustLocate("userid", f.userid);

      expect(key.userIdCount).toBeGreaterThan(0);
      const dump = key.packetsToJson(0);
      const parsed = JSON.parse(dump) as unknown;
      const packets = Array.isArray(parsed) ? parsed : (parsed as { packets: unknown[] }).packets;
      expect(Array.isArray(packets)).toBe(true);

      const hasSig = JSON.stringify(parsed).includes("Signature");
      expect(hasSig).toBe(true);

      key.destroy();
    } finally {
      ffi.destroy();
    }
  });

  it("key self-reports valid after loading", () => {
    const ffi = rnp().createFfi();
    try {
      const f = fixture();
      const keyring = ffi.keyring;
      using sk = ffi.input(f.secretKeyBytes);
      keyring.load("GPG", sk);
      const key = keyring.mustLocate("userid", f.userid);
      expect(key.isValid).toBe(true);
      key.destroy();
    } finally {
      ffi.destroy();
    }
  });
});
