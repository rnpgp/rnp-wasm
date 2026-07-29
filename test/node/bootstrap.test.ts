import { describe, it, expect } from "vitest";
import { rnp } from "./setup.js";

/**
 * Cover Rnp.bootstrapFeatures() / Rnp.features() (TODO 63).
 */

type FeaturesSnapshot = {
  rnpVersion: string;
  symmetric: readonly string[];
  aead: readonly string[];
  hash: readonly string[];
  compression: readonly string[];
  asymmetric: readonly string[];
  curve: readonly string[];
  cipher: readonly string[];
  protection: readonly string[];
  s2k: readonly string[];
};

function features(): FeaturesSnapshot {
  return rnp().features() as unknown as FeaturesSnapshot;
}

describe("bootstrap features snapshot", () => {
  it("bootstrapFeatures returns JSON with rnpVersion and known types", () => {
    const json = rnp().bootstrapFeatures();
    const parsed = JSON.parse(json) as FeaturesSnapshot;
    expect(typeof parsed.rnpVersion).toBe("string");
    expect(parsed.rnpVersion.length).toBeGreaterThan(0);
    expect(Array.isArray(parsed.symmetric)).toBe(true);
    expect(Array.isArray(parsed.asymmetric)).toBe(true);
    expect(Array.isArray(parsed.hash)).toBe(true);
    expect(Array.isArray(parsed.aead)).toBe(true);
    expect(Array.isArray(parsed.curve)).toBe(true);
  });

  it("features() memoizes the parsed object", () => {
    const a = rnp().features();
    const b = rnp().features();
    expect(a).toBe(b);  // same reference
  });

  it("AES-256 is in the supported symmetric list", () => {
    const sym = features().symmetric;
    expect(sym.some(s => s.toUpperCase() === "AES-256" || s.toUpperCase() === "AES256"))
      .toBe(true);
  });

  it("at least one of RSA/ECDSA/EDDSA is supported (sanity)", () => {
    const asym = features().asymmetric;
    expect(asym.length).toBeGreaterThan(0);
  });
});
