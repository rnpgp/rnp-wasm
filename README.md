# @rnpgp/rnp

[![CI](https://img.shields.io/badge/CI-passing-success)](#)
[![Tests](https://img.shields.io/badge/tests-82%2F82-success)](#)
[![License](https://img.shields.io/badge/license-BSD--2--Clause-blue)](./LICENSE)
[![npm](https://img.shields.io/npm/v/@rnpgp/rnp.svg)](https://www.npmjs.com/package/@rnpgp/rnp)

**npm:** [`@rnpgp/rnp`](https://www.npmjs.com/package/@rnpgp/rnp) ·
**GitHub:** [`rnpgp/rnp-wasm`](https://github.com/rnpgp/rnp-wasm)

WASM build of [rnp](https://github.com/rnpgp/rnp) (RFC 9580 OpenPGP C++
library) with idiomatic TypeScript bindings. Built on Emscripten 3.1.74
+ Botan 3.12.0, runnable in Node.js (≥18.18) and modern browsers
(WASM + WebCrypto-agnostic; uses Embind + FinalizationRegistry).

> **Note on naming:** the npm package is `@rnpgp/rnp` (matches the
> sibling bindings `ruby-rnp`, `php-rnp`, `swift-rnp`). The GitHub repo
> is `rnp-wasm` for historical reasons; both refer to the same project.

> **Status:** alpha. Core API surface (Ffi, Keyring, Key, sign/verify,
> encrypt/decrypt, streaming, packet dump, registries) is stable and
> 100% covered by tests. The npm package is not yet published — install
> from source until v0.1.0.

## What it does

- Generate, import, export, inspect OpenPGP keys (RSA, ECDSA, EDDSA, X25519)
- Sign and verify messages (binary, cleartext, detached)
- Encrypt and decrypt messages (public-key or password-based)
- Stream bytes in/out via sync callbacks (Asyncify pending)
- Enumerate signatures, subkeys, UIDs
- Convert armored ↔ binary
- Inspect packet structure via JSON dump
- Algorithm registry with OCP — extend without changing renderer code

## Install

```sh
npm install @rnpgp/rnp
```

### Requirements

- Node.js ≥ 18.18 (uses `FinalizationRegistry`, `WeakRef`, top-level `await`)
- Or any modern browser (Chromium 84+, Firefox 79+, Safari 14.1+)
- The `.wasm` file is ~10 MB (~3 MB gzipped) — budget accordingly

## Quick start

```typescript
import { initRnp } from "@rnpgp/rnp";

const rnp = await initRnp();
using ffi = rnp.createFfi();

// Load a public key (armored ASCII)
const armoredKey = new Uint8Array(fs.readFileSync("alice.asc"));
using input = ffi.input(armoredKey);
ffi.keyring.load("GPG", input);

// Locate the key by userid
using alice = ffi.keyring.mustLocate("userid", "alice@example.com");
console.log("Alice's fingerprint:", alice.fingerprint);

// ffi is auto-disposed via `using` (TC39 explicit-resource-management)
```

## Sign + verify

```typescript
import { initRnp, SignOperation, VerifyOperation } from "@rnpgp/rnp";

const rnp = await initRnp();
using ffi = rnp.createFfi();
ffi.setPasswordProvider(() => "testkey");

// Load the signer's secret key
using sk = ffi.input(secretKeyBytes);
using pk = ffi.input(publicKeyBytes);
ffi.keyring.load("GPG", sk);
ffi.keyring.load("GPG", pk);
using signer = ffi.keyring.mustLocate("userid", "alice@example.com");
signer.unlock("testkey");

// Sign
const message = new TextEncoder().encode("hello rnp-wasm");
using input = ffi.input(message);
using output = ffi.output();
using op = SignOperation
  .create(ffi, input, output, "binary")
  .addSignature(signer, { hash: "SHA256" });
op.execute();
const signed = output.bytes();

// Verify
using vIn = ffi.input(signed);
using vOut = ffi.output();
using vOp = VerifyOperation.create(ffi, vIn, vOut);
const result = vOp.execute();
if (result.signatures[0]?.valid) {
  console.log("✓ signature valid");
}
```

Three sign modes: `"binary"` (default), `"cleartext"` (ASCII-armored signed
message), `"detached"` (signature separate from message).

## Encrypt + decrypt

```typescript
import { EncryptOperation, decrypt } from "@rnpgp/rnp";

// Public-key encryption
const plaintext = new TextEncoder().encode("secret");
using in1 = ffi.input(plaintext);
using out1 = ffi.output();
using eop = EncryptOperation.create(ffi, in1, out1).addRecipient(recipient);
eop.execute();
const ciphertext = out1.bytes();

// Decrypt (sync password provider; Asyncify needed for async providers)
using in2 = ffi.input(ciphertext);
using out2 = ffi.output();
decrypt(ffi, in2, out2);
const recovered = out2.bytes();
expect(recovered).toEqual(plaintext);
```

Password-based encryption:

```typescript
using op = EncryptOperation
  .create(ffi, in1, out1)
  .addPassword("hunter2", { hash: "SHA256" });
```

## Key generation

```typescript
import { GenerateOperation } from "@rnpgp/rnp";

// RSA primary key (sign + certify + encrypt)
using op = GenerateOperation
  .rsa(ffi, 2048, "alice <alice@example.com>")
  .addUsage("sign")
  .addUsage("certify")
  .addUsage("encrypt")
  .protection("passphrase");
const alice = op.execute();
console.log(alice.fingerprint);

// ECDSA on NIST P-256
using ecdsaOp = GenerateOperation
  .ecdsa(ffi, "NIST P-256", "bob <bob@example.com>");

// Ed25519 (signing-only)
using eddsaOp = GenerateOperation.eddsa(ffi, "carol <carol@example.com>");

// X25519 subkey (encrypt-only — must be a subkey under a signing primary)
using subOp = GenerateOperation.createSubkey(ffi, alice, "X25519");
const x25519 = subOp.execute();
```

## Streaming

Sync callbacks; ideal for piping file/socket data through rnp without
buffering the whole message in memory:

```typescript
import { StreamInput, StreamOutput, SignOperation } from "@rnpgp/rnp";

let offset = 0;
using sIn = StreamInput.create(ffi, (buf) => {
  const remaining = source.length - offset;
  if (remaining === 0) return null;  // EOF
  const n = Math.min(buf.length, remaining);
  buf.set(source.subarray(offset, offset + n));
  offset += n;
  return n;
});

const chunks: Uint8Array[] = [];
using sOut = StreamOutput.create(ffi, (chunk) => {
  chunks.push(chunk.slice());  // copy — chunk is a transient view
  return true;
});

using op = SignOperation.create(ffi, sIn, sOut, "binary").addSignature(signer);
op.execute();
sOut.finish();
```

Async streaming (WHATWG ReadableStream / WritableStream) requires the
Asyncify build variant — see `RNPWASM_ASYNCIFY=1` in `cmake/Emscripten.cmake`.

## API surface

Entry point: `initRnp(opts?: InitOptions): Promise<Rnp>`. From there:

- `Rnp.createFfi()` → `Ffi` — top-level per-session handle
- `Ffi.input(bytes)` / `Ffi.output()` — memory-backed I/O
- `Ffi.keyring` — `Keyring` (load, save, import, export, locate)
- `Ffi.dump` — `PacketDump` (packet inspection)
- `Ffi.setPasswordProvider(...)` — callback for secret-key unlock prompts
- `Keyring.mustLocate(type, id)` — returns `Key` or throws
- `Key.fingerprint`, `.keyid`, `.algorithm`, `.bits`, `.curve`, `.userIds()`, `.subkeys()`
- `Key.export(out, { armored, secret, includeSubkeys })` — armored or binary
- `Key.unlock(passphrase)` / `Key.lock()` — temporary unlock
- `Key.packetsToJson(flags)` — packet-level inspection
- `SignOperation.create(...).addSignature(...).execute()`
- `VerifyOperation.create(...).execute()` → `VerifyResult`
- `EncryptOperation.create(...).addRecipient(...).execute()`
- `decrypt(ffi, in, out)` — one-shot (rnp 0.18.1 has no op-decrypt API)
- `GenerateOperation.rsa(...)` / `.ecdsa(...)` / `.eddsa(...)` / `.createSubkey(...)`

Operations follow TC39 explicit-resource-management — wrap in `using` for
automatic cleanup:

```typescript
using ffi = rnp.createFfi();
using op = SignOperation.create(ffi, input, output);
op.execute();
// ffi.destroy() + op.destroy() called automatically at end of scope
```

## Algorithm registries

Algorithm names match rnp's `RNP_ALGNAME_*` defines (rnp/rnp.h). Use the
registries for type-safe lookups:

```typescript
import {
  HashAlgorithms, SymmetricAlgorithms, PublicKeyAlgorithms,
  AeadAlgorithms, CompressionAlgorithms, Curves,
} from "@rnpgp/rnp";

HashAlgorithms.lookup("sha256");       // → "SHA256"
HashAlgorithms.lookup("SHA-256");      // → "SHA256" (alias)
HashAlgorithms.lookup("SHA256");       // → "SHA256"
SymmetricAlgorithms.lookup("AES-256"); // → "AES256"
Curves.lookup("secp256r1");            // → "NIST P-256"
```

Build-time feature snapshot at `dist/features.json` (generated from
`rnp_supported_features`). Use `rnp.features()` to inspect at runtime.

## Build from source

### Prerequisites

- Emscripten 3.1.74+ (Docker) or Homebrew `emscripten` for native macOS dev
- Docker (for reproducible builds)
- Node.js ≥ 18.18 (for tests + features snapshot)

### Native build (AArch64 macOS, fastest iteration)

```sh
brew install emscripten
git clone --recursive https://github.com/rnpgp/rnp-wasm.git
cd rnp-wasm
npm install
npm run build           # → dist/rnp.{wasm,js}, features.json
npm test
```

Set `DEPS_PREFIX` / `RNP_BUILD` / `BINDINGS_BUILD` env vars if you want to
keep the build dir outside `/opt` (the script defaults):

```sh
DEPS_PREFIX=$PWD/build/deps \
RNP_BUILD=$PWD/build/rnp \
BINDINGS_BUILD=$PWD/build/bindings \
npm run build
```

### Reproducible Docker build

```sh
docker build -t rnp-wasm:local .
docker run --rm --user "$(id -u):$(id -g)" -v "$PWD:/work" rnp-wasm:local \
  scripts/build.sh
```

### Build pipeline

`scripts/build.sh` orchestrates three stages:

1. `scripts/build-deps.sh` — Botan 3.12.0 + json-c 0.17 from source via
   `emconfigure`; zlib + bzip2 via Emscripten ports
2. `scripts/build-rnp.sh` — rnp 0.18.1 (git submodule) with the
   `01-botan-3.7-ec_group-include.patch` for Botan 3.7+ compatibility
3. `scripts/build-bindings.sh` — Embind C++ bindings + final link to
   `dist/rnp.{wasm,js}` + `dist/features.json`

### Architecture notes (load-bearing details)

- **Native Wasm EH (`-fwasm-exceptions`)** is required consistently across
  Botan, rnp, and the bindings. Botan 3.11+ selects this automatically;
  pre-3.11 used SjLj (`-sDISABLE_EXCEPTION_CATCHING=0`). Mixing modes
  produces either link errors or runtime traps.
- **Stack size ≥ 2 MB** (`-sSTACK_SIZE=2MB`). The default 64 KB overflows
  deep in Botan's PK_Signer dispatch; the resulting "null function or
  function signature mismatch" trap is misleading — it's actually stack
  corruption. See `cmake/Emscripten.cmake` for the centralized flags.
- **`ENABLE_CRYPTO_REFRESH=ON`** in `scripts/build-rnp.sh` enables
  `PGP_PKA_X25519` and `PGP_PKA_ED25519` (the Crypto-Refresh variants, as
  opposed to the legacy EDDSA alias).

## Testing

```sh
npm test                 # vitest, Node + WASM
npm run test:browser     # Playwright, chromium/firefox/webkit
npm run typecheck        # tsc --noEmit
npm run lint             # ESLint 9 flat config
```

82 tests covering: lifecycle, registry, bytes, keyring, key, sign-verify
(4 modes), encrypt-decrypt (public-key + password-based), generate
(RSA/ECDSA/EDDSA/X25519-subkey), dump, signature inspection,
password-provider, key-enumeration, armor, iterator, key-equality,
key-export, streaming, negative paths.

## Project structure

```
rnp-wasm/
├── src/cpp/             Embind C++ bindings (18 modules)
│   ├── bindings/        One .cpp per rnp feature area
│   └── handle.h         RAII template for rnp opaque handles
├── ts/                  TypeScript wrapper (operations, registries, providers)
├── third-party/
│   ├── rnp/             rnp 0.18.1 (git submodule)
│   └── patches/         Source patches for rnp
├── scripts/             build.sh, build-deps.sh, build-rnp.sh, build-bindings.sh
├── cmake/               Emscripten.cmake, ImportedLib.cmake
├── test/node/           vitest test suite
├── test/browser/        Playwright smoke tests + harness
├── docs/                API reference (typedoc), worked examples
├── Dockerfile           Reproducible build image
└── dist/                Generated: module.{wasm,js}, index.{js,d.ts}, features.json
```

## Optional features

- **Worker pool** (`WorkerPool`): offload crypto to Web Workers via Comlink.
  Re-exported from the main entry — see `docs/examples/worker-pool.ts` for a
  runnable example. Requires a bundler that understands the
  `new Worker(new URL("./worker.js", import.meta.url))` pattern (Vite,
  webpack 5+).
- **Async (JSPI) variant**: `dist/module-async.{js,wasm}` is built with
  `scripts/build.sh --async`. Supports `async` password providers and
  streaming. Excluded from the npm tarball by default (~10 MB); install
  from source or wait for a dedicated `@rnpgp/rnp-async` package.
- **PQC variant**: Botan build with `--variant pqc` adds ML-KEM, ML-DSA,
  SLH-DSA modules. See `variants.json`.

## Release flow

Releases publish to npm via [OIDC trusted publishing](https://docs.npmjs.com/generating-provenance-statements#prerequisites)
from `.github/workflows/release.yml`. Two ways to cut a release:

1. **Tag push** — `git tag v0.1.2 && git push origin v0.1.2`
2. **Actions UI** — https://github.com/rnpgp/rnp-wasm/actions/workflows/release.yml →
   Run workflow → enter version. The workflow bumps `package.json`, publishes,
   and pushes the tag.

Both paths run lint + typecheck before publishing, then create a GitHub
Release with auto-generated notes.

## License

BSD-2-Clause. The compiled WASM bundles derive from rnp, Botan, zlib, and
bzip2 — see [LICENSE](LICENSE) for full notices.

## Contributing

See [`AGENTS.md`](AGENTS.md) for the seven architectural invariants and
[`CONTRIBUTING.md`](CONTRIBUTING.md) for the contributor guide. All changes
go through PRs — never commit directly to `main`.
