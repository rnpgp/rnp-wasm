import { describe, it, expect } from "vitest";
import { rnp, fixture } from "./setup.js";
import {
  StreamInput, StreamOutput, SignOperation, VerifyOperation,
} from "../../ts/index.js";

/**
 * Cover StreamInput/StreamOutput by feeding bytes into sign and capturing
 * the signed output via callbacks. Operations now accept AnyInput/AnyOutput
 * so StreamInput/StreamOutput pass directly without casts.
 */
describe("streaming I/O (sync callbacks)", () => {
  it("StreamInput feeds bytes; reader returns null at EOF", () => {
    const ffi = rnp().createFfi();
    try {
      const source = new TextEncoder().encode("streamed-input-payload");
      let offset = 0;
      let readCalls = 0;
      using input = StreamInput.create(ffi, (buf) => {
        readCalls++;
        const remaining = source.length - offset;
        if (remaining === 0) return null;
        const n = Math.min(buf.length, remaining);
        for (let i = 0; i < n; i++) buf[i] = source[offset + i]!;
        offset += n;
        return n;
      });

      // rnp_input_from_callback doesn't invoke the reader eagerly — it only
      // fires when bytes are pulled. Drain the input via the packet dumper.
      try { ffi.dump.toJson(input, 0); } catch { /* expected: not a real packet */ }

      expect(readCalls).toBeGreaterThan(0);
      expect(offset).toBe(source.length);
    } finally {
      ffi.destroy();
    }
  });

  it("StreamInput → SignOperation → StreamOutput round-trip", () => {
    const ffi = rnp().createFfi();
    try {
      const f = fixture();
      const keyring = ffi.keyring;
      using sk = ffi.input(f.secretKeyBytes);
      using pk = ffi.input(f.publicKeyBytes);
      keyring.load("GPG", sk);
      keyring.load("GPG", pk);
      const signer = keyring.mustLocate("userid", f.userid);
      signer.unlock(f.passphrase);

      const message = new TextEncoder().encode("streamed-message");
      let inOffset = 0;
      using sIn = StreamInput.create(ffi, (buf) => {
        const remaining = message.length - inOffset;
        if (remaining === 0) return null;
        const n = Math.min(buf.length, remaining);
        for (let i = 0; i < n; i++) buf[i] = message[inOffset + i]!;
        inOffset += n;
        return n;
      });

      const collected: Uint8Array[] = [];
      using sOut = StreamOutput.create(ffi, (chunk) => {
        collected.push(chunk.slice());
        return true;
      });

      using op = SignOperation.create(ffi, sIn, sOut, "binary").addSignature(signer);
      op.execute();
      sOut.finish();

      // The signed output should be non-empty and contain at least one chunk.
      expect(collected.length).toBeGreaterThan(0);
      const total = collected.reduce((n, c) => n + c.length, 0);
      expect(total).toBeGreaterThan(0);

      // Verify by re-feeding the concatenated signed bytes.
      const signed = new Uint8Array(total);
      let off = 0;
      for (const c of collected) { signed.set(c, off); off += c.length; }

      using vIn = ffi.input(signed);
      using vOut = ffi.output();
      using vOp = VerifyOperation.create(ffi, vIn, vOut);
      const result = vOp.execute();
      expect(result.signatures[0]!.valid).toBe(true);
      signer.destroy();
    } finally {
      ffi.destroy();
    }
  });

  it("StreamOutput.finish() is callable without error", () => {
    const ffi = rnp().createFfi();
    try {
      using out = StreamOutput.create(ffi, () => true);
      expect(() => out.finish()).not.toThrow();
    } finally {
      ffi.destroy();
    }
  });
});
