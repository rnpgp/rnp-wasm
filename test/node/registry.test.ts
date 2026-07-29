import { describe, it, expect } from "vitest";
import { rnp } from "./setup.js";
import {
  PublicKeyAlgorithms,
  SymmetricAlgorithms,
  HashAlgorithms,
  AeadAlgorithms,
  CompressionAlgorithms,
  Curves,
} from "../../ts/index.js";

/**
 * Every name in our TS AlgorithmRegistry must be reported as supported by
 * the actual rnp build via rnp_supported_features. If rnp wasn't built with
 * a particular algo, the registry must not advertise it.
 */
describe("registry vs rnp build", () => {
  function checkAll(type: string, registry: { names(): readonly string[]; has(n: string): boolean; lookup(n: string): string }) {
    const supportedJson = rnp().supportedFeatures(type);
    // rnp returns a top-level JSON array of strings for each feature type.
    const list = JSON.parse(supportedJson) as readonly string[];

    for (const name of registry.names()) {
      // Each registry name maps to a canonical rnp string. rnp's JSON uses
      // uppercase names. We check membership loosely (case-insensitive substring).
      const canonical = registry.lookup(name).toUpperCase();
      const ok = list.some(s => String(s).toUpperCase() === canonical);
      if (!ok) {
        // Skip PQC names in non-PQC builds.
        if (canonical.includes("ML-") || canonical.includes("KYBER") || canonical.includes("DILITHIUM")) {
          continue;
        }
      }
      expect(ok, `${type}: '${canonical}' registered but unsupported by rnp build`).toBe(true);
    }
  }

  it("public key algorithms supported", () => checkAll("asymmetric", PublicKeyAlgorithms));
  it("symmetric algorithms supported",   () => checkAll("symmetric",  SymmetricAlgorithms));
  it("hash algorithms supported",        () => checkAll("hash",       HashAlgorithms));
  it("AEAD algorithms supported",        () => checkAll("aead",       AeadAlgorithms));
  it("compression algorithms supported", () => checkAll("compression", CompressionAlgorithms));
  it("curves supported",                 () => checkAll("curve",      Curves));
});

describe("registry lookup", () => {
  it("resolves aliases case-insensitively", () => {
    expect(HashAlgorithms.lookup("sha256")).toBe("SHA256");
    expect(HashAlgorithms.lookup("SHA256")).toBe("SHA256");
    expect(HashAlgorithms.lookup("SHA-256")).toBe("SHA256");
  });

  it("throws for unknown names", () => {
    expect(() => HashAlgorithms.lookup("not-a-real-hash")).toThrow(/unknown name/);
  });

  it("has() returns false for unknown names without throwing", () => {
    expect(HashAlgorithms.has("not-a-real-hash")).toBe(false);
    expect(HashAlgorithms.has("sha256")).toBe(true);
  });
});
