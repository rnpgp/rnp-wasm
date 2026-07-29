import { beforeAll, afterAll } from "vitest";
import { join } from "node:path";
import { initRnp, type Rnp } from "../../ts/index.js";
import { ensureRsaFixture, type RsaFixture } from "../fixtures/keys.js";

let _rnp: Rnp | undefined;
let _fixture: RsaFixture | undefined;

/**
 * Loads the WASM module once per test run. The `dist/` directory must be
 * populated (run `scripts/build.sh` first). The locateFile hook resolves
 * the .wasm relative to dist/, matching the published package layout.
 *
 * Also bootstraps the RSA fixture (generates on first run, caches under
 * test/fixtures/keys/.cache/).
 */
beforeAll(async () => {
  if (_rnp && _fixture) return;
  if (!_rnp) {
    _rnp = await initRnp({
      locateWasm: (p) => join(process.cwd(), "dist", p),
    });
  }
  if (!_fixture) {
    _fixture = await ensureRsaFixture(_rnp);
  }
}, 60_000);

afterAll(async () => {
  // Module + fixture are intentionally kept alive across tests for speed.
});

export function rnp(): Rnp {
  if (!_rnp) throw new Error("test setup: initRnp() did not complete");
  return _rnp;
}

export function fixture(): RsaFixture {
  if (!_fixture) throw new Error("test setup: fixture not yet bootstrapped");
  return _fixture;
}
