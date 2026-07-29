import { describe, it, expect } from "vitest";
import {
  bytesToHex, hexToBytes,
  bytesToBase64, base64ToBytes,
  concatBytes, utf8ToBytes, bytesToUtf8,
  constantTimeEqual,
} from "../../ts/index.js";

describe("bytes", () => {
  describe("hex", () => {
    it("round-trips", () => {
      const original = new Uint8Array([0, 1, 2, 254, 255]);
      const hex = bytesToHex(original);
      expect(hex).toBe("000102feff");
      expect(hexToBytes(hex)).toEqual(original);
    });

    it("handles empty input", () => {
      expect(bytesToHex(new Uint8Array())).toBe("");
      expect(hexToBytes("")).toEqual(new Uint8Array());
    });

    it("rejects odd-length input", () => {
      expect(() => hexToBytes("abc")).toThrow(/odd-length/);
    });

    it("rejects invalid hex digits", () => {
      expect(() => hexToBytes("xy")).toThrow(/invalid hex digit/);
    });
  });

  describe("base64", () => {
    it("round-trips random bytes", () => {
      const original = new Uint8Array(256);
      for (let i = 0; i < original.length; i++) original[i] = i;
      const encoded = bytesToBase64(original);
      const decoded = base64ToBytes(encoded);
      expect(decoded).toEqual(original);
    });

    it("handles padding cases", () => {
      expect(bytesToBase64(new Uint8Array([0]))).toMatch(/==$/);
      expect(bytesToBase64(new Uint8Array([0, 0]))).toMatch(/=$/);
      expect(bytesToBase64(new Uint8Array([0, 0, 0]))).not.toMatch(/=/);
    });
  });

  describe("concat", () => {
    it("concatenates multiple arrays", () => {
      expect(concatBytes(new Uint8Array([1]), new Uint8Array([2, 3])))
        .toEqual(new Uint8Array([1, 2, 3]));
    });
    it("handles empty input list", () => {
      expect(concatBytes()).toEqual(new Uint8Array());
    });
    it("ignores empty chunks", () => {
      expect(concatBytes(new Uint8Array(), new Uint8Array([7])))
        .toEqual(new Uint8Array([7]));
    });
  });

  describe("utf8", () => {
    it("round-trips ASCII", () => {
      expect(bytesToUtf8(utf8ToBytes("hello"))).toBe("hello");
    });
    it("round-trips multi-byte", () => {
      const s = "héllo, 世界";
      expect(bytesToUtf8(utf8ToBytes(s))).toBe(s);
    });
  });

  describe("constantTimeEqual", () => {
    it("returns true for equal arrays", () => {
      expect(constantTimeEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 3]))).toBe(true);
    });
    it("returns false for different arrays of same length", () => {
      expect(constantTimeEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 4]))).toBe(false);
    });
    it("returns false for different lengths", () => {
      expect(constantTimeEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2]))).toBe(false);
    });
  });
});
