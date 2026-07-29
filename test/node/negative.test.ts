import { describe, it, expect } from "vitest";
import { rnp } from "./setup.js";
import { RnpError, HashAlgorithms, VerifyOperation } from "../../ts/index.js";
import { INTERNAL_TOKEN } from "../../ts/internal-brand.js";

/**
 * Negative + lifecycle tests covering error paths, idempotent destroy, and
 * use-after-destroy semantics.
 */
describe("negative paths", () => {
  it("loading invalid bytes throws", () => {
    const ffi = rnp().createFfi();
    try {
      const garbage = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
      using input = ffi.input(garbage);
      expect(() => ffi.keyring.load("GPG", input)).toThrow();
    } finally {
      ffi.destroy();
    }
  });

  it("locating a nonexistent key returns null", () => {
    const ffi = rnp().createFfi();
    try {
      const k = ffi.keyring.locate("userid", "does-not-exist@example.com");
      expect(k).toBeNull();
    } finally {
      ffi.destroy();
    }
  });

  it("mustLocate throws RnpKeyNotFoundError", () => {
    const ffi = rnp().createFfi();
    try {
      expect(() => ffi.keyring.mustLocate("userid", "nope"))
        .toThrow(RnpError);
    } finally {
      ffi.destroy();
    }
  });

  it("Registry.lookup throws on unknown name", () => {
    expect(() => HashAlgorithms.lookup("not-a-real-hash")).toThrow(/unknown name/);
  });

  it("verify on unsigned input either throws or reports zero signatures", () => {
    const ffi = rnp().createFfi();
    try {
      const garbage = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
      using input = ffi.input(garbage);
      using output = ffi.output();
      expect(() => {
        using op = VerifyOperation.create(ffi, input, output);
        op.execute();
      }).toThrow();
    } finally {
      ffi.destroy();
    }
  });
});

describe("handle lifecycle", () => {
  it("destroy() is idempotent", () => {
    const ffi = rnp().createFfi();
    ffi.destroy();
    expect(() => ffi.destroy()).not.toThrow();
  });

  it("use after destroy throws RnpError", () => {
    const ffi = rnp().createFfi();
    ffi.destroy();
    expect(() => ffi.raw_(INTERNAL_TOKEN)).toThrow(RnpError);
    expect(() => ffi.keyring).toThrow(RnpError);
  });

  it("[Symbol.dispose] invokes destroy", () => {
    const ffi: { [Symbol.dispose](): void; isAlive: boolean } = rnp().createFfi();
    expect(ffi.isAlive).toBe(true);
    ffi[Symbol.dispose]();
    expect(ffi.isAlive).toBe(false);
  });
});
