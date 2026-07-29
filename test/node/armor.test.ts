import { describe, it, expect } from "vitest";
import { rnp } from "./setup.js";
import { INTERNAL_TOKEN } from "../../ts/internal-brand.js";

describe("armor / dearmor round-trip", () => {
  it("enarmor produces ASCII output starting with PGP MESSAGE", () => {
    const ffi = rnp().createFfi();
    try {
      const payload = new TextEncoder().encode("armor me please");
      using input = ffi.input(payload);
      using out = ffi.output();
      // rnpEnarmor signature: (input, output, type) — empty type lets rnp guess.
      ffi.module_(INTERNAL_TOKEN).rnpEnarmor(input.raw, out.raw, "");
      const text = new TextDecoder().decode(out.bytes());
      expect(text).toMatch(/-----BEGIN PGP MESSAGE-----/);
      expect(text).toMatch(/-----END PGP MESSAGE-----/);
    } finally {
      ffi.destroy();
    }
  });

  it("dearmor reverses enarmor", () => {
    const ffi = rnp().createFfi();
    try {
      const original = new TextEncoder().encode("round-trip armor test");
      using enIn = ffi.input(original);
      using enOut = ffi.output();
      ffi.module_(INTERNAL_TOKEN).rnpEnarmor(enIn.raw, enOut.raw, "");
      const armored = enOut.bytes();

      using deIn = ffi.input(armored);
      using deOut = ffi.output();
      ffi.module_(INTERNAL_TOKEN).rnpDearmor(deIn.raw, deOut.raw);
      expect(deOut.bytes()).toEqual(original);
    } finally {
      ffi.destroy();
    }
  });

  it("guessContents distinguishes binary from armored", () => {
    const ffi = rnp().createFfi();
    try {
      const binary = new Uint8Array([0, 1, 2, 3, 0xff]);
      using binIn = ffi.input(binary);
      const binKind = ffi.module_(INTERNAL_TOKEN).rnpGuessContents(binIn.raw);
      expect(binKind.length).toBeGreaterThan(0);

      const armored = new TextEncoder().encode(
        "-----BEGIN PGP MESSAGE-----\n\nempty\n-----END PGP MESSAGE-----\n"
      );
      using armIn = ffi.input(armored);
      const armKind = ffi.module_(INTERNAL_TOKEN).rnpGuessContents(armIn.raw);
      expect(armKind).not.toBe(binKind);
    } finally {
      ffi.destroy();
    }
  });
});
