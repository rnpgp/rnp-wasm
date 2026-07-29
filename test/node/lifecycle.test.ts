import { describe, it, expect } from "vitest";
import { rnp } from "./setup.js";
import { RnpError, assertRnpSuccess } from "../../ts/index.js";
import { INTERNAL_TOKEN } from "../../ts/internal-brand.js";

describe("lifecycle", () => {
  it("loads the WASM module", () => {
    expect(rnp()).toBeDefined();
  });

  it("exposes version string in semver shape", () => {
    const v = rnp().versionString();
    expect(v).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("exposes full version string", () => {
    const v = rnp().versionStringFull();
    expect(v.length).toBeGreaterThan(0);
  });

  it("exposes a positive commit timestamp", () => {
    expect(Number(rnp().versionCommitTimestamp())).toBeGreaterThanOrEqual(0);
  });

  it("creates and destroys an FFI handle without leak", () => {
    const ffi = rnp().createFfi();
    expect(ffi.isAlive).toBe(true);
    ffi.destroy();
    expect(ffi.isAlive).toBe(false);
  });

  it("destroy() is idempotent", () => {
    const ffi = rnp().createFfi();
    ffi.destroy();
    expect(() => ffi.destroy()).not.toThrow();
  });

  it("FFI handle reports use-after-destroy", () => {
    const ffi = rnp().createFfi();
    ffi.destroy();
    expect(() => ffi.raw_(INTERNAL_TOKEN)).toThrow(RnpError);
  });

  it("Ffi factory methods construct Input/Output", () => {
    const ffi = rnp().createFfi();
    try {
      using input = ffi.input(new Uint8Array([1, 2, 3]));
      using output = ffi.output();
      expect(input.isAlive).toBe(true);
      expect(output.isAlive).toBe(true);
    } finally {
      ffi.destroy();
    }
  });
});

describe("assertRnpSuccess", () => {
  it("passes for code 0", () => {
    expect(() => assertRnpSuccess(0)).not.toThrow();
  });
  it("throws RnpError for non-zero", () => {
    expect(() => assertRnpSuccess(1, "ctx")).toThrow(RnpError);
  });
});
