import { describe, it, expect } from "vitest";
import { rnp } from "./setup.js";
import { GenerateOperation } from "../../ts/index.js";

/**
 * Cover Key.subkeys() and Key.userIds() iterators.
 * Uses freshly generated keys so we don't depend on multi-uid fixtures.
 */
describe("key enumeration", () => {
  it("primary key + subkey: subkeyCount and subkeys() agree", () => {
    const ffi = rnp().createFfi();
    try {
      using primaryOp = GenerateOperation.rsa(ffi, 2048, "primary <p@example.com>");
      const primary = primaryOp.execute();
      try {
        using subOp = GenerateOperation.createSubkey(ffi, primary, "RSA").bits(2048);
        const sub = subOp.execute();
        try {
          expect(primary.subkeyCount).toBe(1);
          const subs = [...primary.subkeys()];
          expect(subs).toHaveLength(1);
          expect(subs[0]!.isSubkey).toBe(true);
          expect(subs[0]!.fingerprint).toBe(sub.fingerprint);
        } finally {
          sub.destroy();
        }
      } finally {
        primary.destroy();
      }
    } finally {
      ffi.destroy();
    }
  });

  it("userIds() yields the configured UID", () => {
    const ffi = rnp().createFfi();
    try {
      using op = GenerateOperation.rsa(ffi, 2048, "alice <alice@example.com>");
      const key = op.execute();
      try {
        expect(key.userIdCount).toBe(1);
        const uids = [...key.userIds()];
        expect(uids).toContain("alice <alice@example.com>");
      } finally {
        key.destroy();
      }
    } finally {
      ffi.destroy();
    }
  });

  it("addUserId appends; userIdCount increases", () => {
    const ffi = rnp().createFfi();
    try {
      using op = GenerateOperation.rsa(ffi, 2048, "first <first@example.com>");
      const key = op.execute();
      try {
        // Unlocked key required for mutation; fresh RSA keys aren't protected.
        key.addUserId("second <second@example.com>");
        expect(key.userIdCount).toBe(2);
        const uids = [...key.userIds()];
        expect(uids).toContain("first <first@example.com>");
        expect(uids).toContain("second <second@example.com>");
      } finally {
        key.destroy();
      }
    } finally {
      ffi.destroy();
    }
  });
});
