import { describe, it, expect } from "vitest";
import { rnp } from "./setup.js";
import { GenerateOperation } from "../../ts/index.js";

describe("Key.equals", () => {
  it("self equals self", () => {
    const ffi = rnp().createFfi();
    try {
      using op = GenerateOperation.rsa(ffi, 2048, "eq <eq@x>");
      const key = op.execute();
      try {
        expect(key.equals(key)).toBe(true);
        expect(key.hasFingerprint(key.fingerprint)).toBe(true);
      } finally {
        key.destroy();
      }
    } finally {
      ffi.destroy();
    }
  });

  it("distinct keys are not equal", () => {
    const ffi = rnp().createFfi();
    try {
      using op1 = GenerateOperation.rsa(ffi, 2048, "a <a@x>");
      const k1 = op1.execute();
      try {
        using op2 = GenerateOperation.rsa(ffi, 2048, "b <b@x>");
        const k2 = op2.execute();
        try {
          expect(k1.equals(k2)).toBe(false);
          expect(k1.hasFingerprint(k2.fingerprint)).toBe(false);
        } finally {
          k2.destroy();
        }
      } finally {
        k1.destroy();
      }
    } finally {
      ffi.destroy();
    }
  });

  it("truncated fingerprint returns false", () => {
    const ffi = rnp().createFfi();
    try {
      using op = GenerateOperation.rsa(ffi, 2048, "t <t@x>");
      const key = op.execute();
      try {
        const truncated = key.fingerprint.slice(0, 20);
        expect(key.hasFingerprint(truncated)).toBe(false);
      } finally {
        key.destroy();
      }
    } finally {
      ffi.destroy();
    }
  });
});
