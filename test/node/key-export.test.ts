import { describe, it, expect } from "vitest";
import { rnp } from "./setup.js";
import { GenerateOperation, KeyExportFlags } from "../../ts/index.js";

/**
 * Cover Key.export and Key.exportToBytes via the Ffi-owned Output factory.
 * Doesn't yet cover revoke/remove — those mutate persistent state in ways
 * that need careful fixture management.
 */
describe("key export", () => {
  it("exportToBytes produces armored output for armored:true", () => {
    const ffi = rnp().createFfi();
    try {
      using op = GenerateOperation.rsa(ffi, 2048, "ex <ex@x>");
      const key = op.execute();
      try {
        const bytes = key.exportToBytes(ffi, { armored: true });
        const text = new TextDecoder().decode(bytes);
        expect(text).toMatch(/-----BEGIN PGP PUBLIC KEY BLOCK-----/);
      } finally {
        key.destroy();
      }
    } finally {
      ffi.destroy();
    }
  });

  it("export() writes to caller-provided Output", () => {
    const ffi = rnp().createFfi();
    try {
      using op = GenerateOperation.rsa(ffi, 2048, "ex2 <ex2@x>");
      const key = op.execute();
      try {
        using out = ffi.output();
        key.export(out, { armored: false, secret: false });
        const bytes = out.bytes();
        expect(bytes.length).toBeGreaterThan(0);
        // Binary OpenPGP packets start with 0x95 (packet tag 6, length-type 1).
        // Don't assert exact byte — algorithm-dependent. Just check non-empty.
      } finally {
        key.destroy();
      }
    } finally {
      ffi.destroy();
    }
  });

  it("KeyExportFlags match rnp.h RNP_KEY_EXPORT_* exactly", () => {
    // Verified against third-party/rnp/include/rnp/rnp.h:43-49
    expect(KeyExportFlags.ARMORED).toBe(0x01);
    expect(KeyExportFlags.PUBLIC).toBe(0x02);
    expect(KeyExportFlags.SECRET).toBe(0x04);
    expect(KeyExportFlags.SUBKEYS).toBe(0x08);
    expect(KeyExportFlags.BASE64).toBe(0x200);
  });
});
