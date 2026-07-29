/**
 * test/fixtures/keys.ts
 * Self-bootstrapping test fixtures. Generates a real RSA-2048 keypair on
 * first access using rnp itself, then caches to disk under
 * test/fixtures/keys/.cache/ so subsequent test runs are fast and reproducible.
 *
 * Why generate-on-demand:
 *   - No need to commit binary fixtures or document regeneration steps.
 *   - The fixture's existence proves rnp's key generation + export work.
 *   - Cache is gitignored.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  GenerateOperation,
} from "../../ts/operations/generate.js";
import type { Rnp } from "../../ts/rnp.js";

const here = dirname(fileURLToPath(import.meta.url));
const cacheDir = join(here, "keys", ".cache");

export const RSA_KEY_USERID = "rnp-wasm-test <test@rnp-wasm.example>";
export const RSA_KEY_PASSPHRASE = "testkey";

export interface RsaFixture {
  readonly secretKeyBytes: Uint8Array;
  readonly publicKeyBytes: Uint8Array;
  readonly fingerprint: string;
  readonly userid: string;
  readonly passphrase: string;
}

let _cache: RsaFixture | null = null;

// eslint-disable-next-line @typescript-eslint/require-await
async function tryLoadFromCache(): Promise<RsaFixture | null> {
  const secretPath = join(cacheDir, "rsa-2048-secret.asc");
  const publicPath = join(cacheDir, "rsa-2048-public.asc");
  const fprintPath = join(cacheDir, "rsa-2048-fingerprint.txt");
  if (!(existsSync(secretPath) && existsSync(publicPath) && existsSync(fprintPath))) {
    return null;
  }
  return {
    secretKeyBytes: new Uint8Array(readFileSync(secretPath)),
    publicKeyBytes: new Uint8Array(readFileSync(publicPath)),
    fingerprint: readFileSync(fprintPath, "utf-8").trim(),
    userid: RSA_KEY_USERID,
    passphrase: RSA_KEY_PASSPHRASE,
  };
}

// eslint-disable-next-line @typescript-eslint/require-await
async function generateAndCache(rnp: Rnp): Promise<RsaFixture> {
  const ffi = rnp.createFfi();
  try {
    // Generate with all common usage flags so the key works for sign, certify,
    // and encrypt round-trip tests. RSA primaries default to SC only; without
    // ENCRYPT the encrypt/decrypt tests fail with "No suitable key".
    using op = GenerateOperation.rsa(ffi, 2048, RSA_KEY_USERID)
      .addUsage("sign")
      .addUsage("certify")
      .addUsage("encrypt")
      .protection(RSA_KEY_PASSPHRASE);
    const key = op.execute();
    try {
      const fingerprint = key.fingerprint;

      using secOut = ffi.output();
      key.export(secOut, { armored: true, secret: true, includeSubkeys: true });
      const secretKeyBytes = secOut.bytes();

      using pubOut = ffi.output();
      key.export(pubOut, { armored: true, secret: false, includeSubkeys: true });
      const publicKeyBytes = pubOut.bytes();

      const fixture: RsaFixture = {
        secretKeyBytes, publicKeyBytes, fingerprint,
        userid: RSA_KEY_USERID,
        passphrase: RSA_KEY_PASSPHRASE,
      };

      mkdirSync(cacheDir, { recursive: true });
      writeFileSync(join(cacheDir, "rsa-2048-secret.asc"), secretKeyBytes);
      writeFileSync(join(cacheDir, "rsa-2048-public.asc"), publicKeyBytes);
      writeFileSync(join(cacheDir, "rsa-2048-fingerprint.txt"), fingerprint);

      return fixture;
    } finally {
      key.destroy();
    }
  } finally {
    ffi.destroy();
  }
}

/**
 * Returns the RSA fixture, generating + caching on first call.
 * Idempotent; safe to call from multiple test files.
 */
export async function ensureRsaFixture(rnp: Rnp): Promise<RsaFixture> {
  if (_cache) return _cache;
  _cache = (await tryLoadFromCache()) ?? (await generateAndCache(rnp));
  return _cache;
}
