import { describe, it, expect } from "vitest";
import { rnp, fixture } from "./setup.js";
import { SignOperation } from "../../ts/index.js";

describe("packet dump", () => {
  it("dumpToJson returns JSON with packets array", () => {
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

      const message = new TextEncoder().encode("dump me");
      using input = ffi.input(message);
      using output = ffi.output();
      using op = SignOperation.create(ffi, input, output, "binary").addSignature(signer);
      op.execute();
      const signed = output.bytes();

      using dIn = ffi.input(signed);
      const dump = ffi.dump.toJson(dIn, 0);
      // rnp_dump_packets_to_json outputs a top-level JSON array of packet objects.
      const parsed = JSON.parse(dump) as unknown;
      const packets = Array.isArray(parsed) ? parsed : (parsed as { packets: unknown[] }).packets;
      expect(Array.isArray(packets)).toBe(true);
      expect((packets as unknown[]).length).toBeGreaterThan(0);
      signer.destroy();
    } finally {
      ffi.destroy();
    }
  });
});
