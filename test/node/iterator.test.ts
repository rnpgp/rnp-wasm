import { describe, it, expect } from "vitest";
import { rnp } from "./setup.js";
import { GenerateOperation } from "../../ts/index.js";

describe("identifier iterator", () => {
  it("iterates fingerprints of all loaded keys", async () => {
    const ffi = rnp().createFfi();
    try {
      // Generate three keys into the keyring.
      const seen = new Set<string>();
      for (const uid of ["a <a@x>", "b <b@x>", "c <c@x>"]) {
        using op = GenerateOperation.rsa(ffi, 1024, uid);
        using key = op.execute();
        seen.add(key.fingerprint);
      }

      const keyring = ffi.keyring;
      const collected: string[] = [];
      for await (const fprint of keyring.identifiers("fingerprint")) {
        collected.push(fprint);
      }
      expect(collected.length).toBeGreaterThanOrEqual(3);
      for (const fp of seen) {
        expect(collected).toContain(fp);
      }
    } finally {
      ffi.destroy();
    }
  });

  it("allIdentifiers materializes the iterator", async () => {
    const ffi = rnp().createFfi();
    try {
      using op = GenerateOperation.rsa(ffi, 1024, "solo <solo@x>");
      using key = op.execute();

      const keyring = ffi.keyring;
      const ids = await keyring.allIdentifiers("fingerprint");
      expect(ids).toContain(key.fingerprint);
    } finally {
      ffi.destroy();
    }
  });
});
