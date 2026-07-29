import { describe, it, expect } from "vitest";
import { rnp } from "./setup.js";
import { GenerateOperation } from "../../ts/index.js";

describe("key generation", () => {
  it("RSA 2048 produces a usable key", () => {
    const ffi = rnp().createFfi();
    try {
      using op = GenerateOperation.rsa(ffi, 2048, "gen-test-rsa");
      const key = op.execute();
      try {
        expect(key.bits).toBe(2048);
        expect(key.algorithm.toUpperCase()).toContain("RSA");
        expect([...key.userIds()]).toContain("gen-test-rsa");
      } finally {
        key.destroy();
      }
    } finally {
      ffi.destroy();
    }
  });

  it("Ed25519 key generates quickly", () => {
    const ffi = rnp().createFfi();
    try {
      using op = GenerateOperation.eddsa(ffi, "gen-test-eddsa");
      const key = op.execute();
      try {
        expect(key.curve.toLowerCase()).toContain("ed25519");
      } finally {
        key.destroy();
      }
    } finally {
      ffi.destroy();
    }
  });

  it("X25519 subkey generates and can be inspected", () => {
    // X25519 (PGP_PKA_X25519) is ENCRYPT-only — rnp_op_generate_create rejects
    // it as a primary. Generate it as a subkey under a signing-capable primary.
    // Requires ENABLE_CRYPTO_REFRESH=ON in scripts/build-rnp.sh.
    const ffi = rnp().createFfi();
    try {
      using primaryOp = GenerateOperation.create(ffi, "ECDSA")
        .curve("secp256k1")
        .userId("gen-test-x25519-primary")
        .addUsage("sign")
        .addUsage("certify");
      const primary = primaryOp.execute();
      try {
        using subOp = GenerateOperation.createSubkey(ffi, primary, "X25519");
        const subkey = subOp.execute();
        try {
          expect(subkey.curve.toLowerCase()).toContain("25519");
        } finally {
          subkey.destroy();
        }
      } finally {
        primary.destroy();
      }
    } finally {
      ffi.destroy();
    }
  });

  it("ECDSA on NIST P-256 reports the curve", () => {
    const ffi = rnp().createFfi();
    try {
      using op = GenerateOperation.ecdsa(ffi, "NIST P-256", "gen-test-ecdsa");
      const key = op.execute();
      try {
        expect(key.curve.toLowerCase()).toContain("256");
      } finally {
        key.destroy();
      }
    } finally {
      ffi.destroy();
    }
  });
});
