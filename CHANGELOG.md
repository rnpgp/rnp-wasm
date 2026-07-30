# Changelog

All notable changes to rnp-wasm will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

This file is auto-maintained by [release-please](https://github.com/googleapis/release-please)
based on [Conventional Commits](https://www.conventionalcommits.org/) on `main`.
Do not edit by hand — propose changes via Conventional Commits and let automation update this file.

## 1.0.0 (2026-07-30)


### Features

* ship worker pool as part of public API; remove stale Roadmap ([65c53d0](https://github.com/rnpgp/rnp-wasm/commit/65c53d0aa510b407dfb736905a13c96c834eacf8))


### Bug Fixes

* **0.1.1:** exclude async variant + unused internals from tarball ([6ca39ed](https://github.com/rnpgp/rnp-wasm/commit/6ca39ed3589c94da91454373310a8732fae993e4))
* **0.1.1:** ship the actual public API + TypeScript types ([412739a](https://github.com/rnpgp/rnp-wasm/commit/412739a62a81f1deb4111ece547048cfa09aa27f))
* **bindings:** cast uint64_t timestamp to double for Embind ([b7b4c80](https://github.com/rnpgp/rnp-wasm/commit/b7b4c80d96808f4a617f207b7cb73187ed62fec7))
* **build:** use local tsc binary instead of npx -y tsc ([e30bf6f](https://github.com/rnpgp/rnp-wasm/commit/e30bf6f719dec80cf0acf18ee1ef8f170d524594))
* **ci:** consolidate PR checks into single workflow + syntax fixes ([87618f3](https://github.com/rnpgp/rnp-wasm/commit/87618f358f2f6d4d7e88876c1f153fa5e1daa4fb))
* **ci:** make /opt/rnp-wasm world-writable in Docker image ([b51490d](https://github.com/rnpgp/rnp-wasm/commit/b51490d54024416f4b46d438173d089f79e1ce87))
* **ci:** set HOME=/tmp in Docker image ([0c3c1b9](https://github.com/rnpgp/rnp-wasm/commit/0c3c1b9989705585320324f979d6a2e4d752cdc2))
* do not re-export WorkerPool from main entry ([25d807c](https://github.com/rnpgp/rnp-wasm/commit/25d807ce4768a42dc38e8a94cc07142ef25686d4))
* don't rely on Module.err being exposed in Emscripten 6.x ([89e1022](https://github.com/rnpgp/rnp-wasm/commit/89e1022515cbf58f66b6ceeabbbef3a9259c581b))
* **lint:** ignore test/browser/harness-worker.js ([4f27f2a](https://github.com/rnpgp/rnp-wasm/commit/4f27f2aed65ed9fdfaf40767c1fa06ae0aa12fb6))
* **lint:** type-only import for Page; use console.warn for diagnostics ([5a2789d](https://github.com/rnpgp/rnp-wasm/commit/5a2789d8ee897f019713ae84e483f50a9cbd50bf))
* **package:** add repository field for npm provenance verification ([157592a](https://github.com/rnpgp/rnp-wasm/commit/157592a26785737a358bdab34a99c207a7895543))
* **package:** drop publishConfig.provenance for local publish ([3086e8a](https://github.com/rnpgp/rnp-wasm/commit/3086e8ad73751565ce6d8efbe1590ad184de9fcd))
* **release:** bump publish job to Node 24 to match glossarist setup ([fc630d8](https://github.com/rnpgp/rnp-wasm/commit/fc630d819bcf735826f6d095ce8fb66f6c522df1))
* **release:** drop --provenance from npm publish ([a293c48](https://github.com/rnpgp/rnp-wasm/commit/a293c4872a9a3f858701f0b859c01d4006aab1c5))
* **release:** drop environment: release from publish-npm job ([fae65d1](https://github.com/rnpgp/rnp-wasm/commit/fae65d158cf7fa78eaa83daabb9be8bc7fd8f0af))
* **release:** tolerate no-op commit when version already bumped ([0232951](https://github.com/rnpgp/rnp-wasm/commit/02329519ff6e6c8dc2e301486bcdf612c6d528b8))
* **test:** bump playwright timeouts for slow CI runners ([f9cebee](https://github.com/rnpgp/rnp-wasm/commit/f9cebee10b32d81d0c364ce072a04b7eec8c3b62))
* **test:** make browser harness serveable by vite preview ([d45d120](https://github.com/rnpgp/rnp-wasm/commit/d45d1205b1c0c4616a5cdd56462a21366dc1fc04))
* **test:** replace vite preview/dev with python http.server for browser harness ([82a461a](https://github.com/rnpgp/rnp-wasm/commit/82a461aad6fba860697a30f4fd2b1b95bc4ebb6f))
* **test:** use absolute paths for harness URLs in goto() ([8247f1d](https://github.com/rnpgp/rnp-wasm/commit/8247f1db7751e8eb9cc962875173d7a47f8b323a))
* **test:** use correct baseURL for python http.server ([4f9da38](https://github.com/rnpgp/rnp-wasm/commit/4f9da384b44639aedcf95064090c96f1235e6fa8))
* **test:** use real module worker instead of Blob URL ([30c8230](https://github.com/rnpgp/rnp-wasm/commit/30c82307346a97d651bda156150a4b8e32b21e6b))
* **test:** use vite dev mode instead of preview for browser harness ([8960038](https://github.com/rnpgp/rnp-wasm/commit/8960038580255f05f7f97f19383cde782d91b8aa))

## [0.1.0] - 2026-07-29

First public alpha. Core API stable; 82/82 tests pass against rnp 0.18.1 +
Botan 3.12.0 + Emscripten 3.1.74.

### Added

- Initial scaffold: Dockerfile + scripts for reproducible Emscripten builds.
- Embind bindings covering FFI lifecycle, IO, keyring, key, UID, signature,
  generate, sign, verify, encrypt, decrypt, dump, iterator, stream.
- TypeScript wrapper: `Rnp`, `Ffi`, `Keyring`, `Key`, `Uid`, `Signature`,
  `Input`, `Output`, `PacketDump`, `IdentifierIterator`, `StreamInput`,
  `StreamOutput`.
- Fluent operation builders: `SignOperation`, `VerifyOperation`,
  `EncryptOperation`, `GenerateOperation` (RSA/ECDSA/EDDSA/X25519 subkey),
  plus one-shot `decrypt()` (rnp 0.18.1 has no op-decrypt API).
- OCP registries for algorithms, hashes, AEAD modes, curves, features.
  Registry canonical names match rnp's `RNP_ALGNAME_*` defines.
- Typed `RnpError` hierarchy.
- Constant-time byte utilities (`bytesToHex`, `constantTimeEqual`, ...).
- Vitest test suite (18 files, 82 tests): lifecycle, registry, bytes,
  keyring, key, sign-verify (binary/cleartext/detached/tampered),
  encrypt-decrypt (public-key + password-based), generate
  (RSA/ECDSA/EDDSA/X25519-subkey), dump, signature inspection,
  password-provider, key-enumeration, armor, iterator, key-equality,
  key-export, streaming, bootstrap features, negative paths.
- Playwright browser smoke harness (chromium, firefox, webkit).
- CI workflows: build/test pipeline, OIDC npm publish, upstream tracker
  (weekly probe against rnp `main`), bundle size budget, release-please.
- Documentation set: README, architecture, build, api, security, SECURITY,
  CONTRIBUTING, api-readme.
- Build variants: default (trimmed Botan module set via `--enable-modules`),
  async (JSPI for async password providers + streaming), pqc (ML-KEM/ML-DSA),
  brainpool, sm (SM2/SM3/SM4).
- Streaming callback C++ bindings (sync; async via JSPI variant).
- Worker pool (Comlink) for off-main-thread crypto with sticky FFI + Keyring
  per session, round-robin scheduling.
- Memory pool for JS↔WASM byte transfers.
- Bundle analyzer (`scripts/analyze-bundle.sh`).
- `dist/features.json`: build-time snapshot from `rnp_supported_features`.
- `rnpBootstrapFeatures()` for runtime introspection of supported algorithms.

### Changed

- Botan bumped 3.5.0 → 3.12.0 (5 CVE fixes including SM2 heap over-read,
  OCSP forgery, BER DoS, name-constraints bypass, cert auth bypass).
- Switched EH mechanism: `-sDISABLE_EXCEPTION_CATCHING=0` (SjLj)
  → `-fwasm-exceptions` (native Wasm EH) — matches Botan 3.11+ default.
- `ENABLE_CRYPTO_REFRESH=ON` in rnp build — required for `PGP_PKA_X25519`
  and `PGP_PKA_ED25519` (Crypto-Refresh variants).
- Hash/symmetric algorithm canonical names normalized to rnp's
  `RNP_ALGNAME_*` defines (e.g. `SHA256` not `SHA-256`).

### Fixed

- Stack overflow in Botan PK_Signer dispatch (was reported as misleading
  "null function or function signature mismatch" trap). Fixed by setting
  `-sSTACK_SIZE=2MB` consistently in cmake/Emscripten.cmake.
- Missing trailing `\` in scripts/build-rnp.sh that silently dropped
  `-DCMAKE_CXX_FLAGS` and all subsequent CMake flags.
- StreamInput/StreamOutput Embind type rejection when passed to operations
  expecting InputHandle/OutputHandle — now properly subclassed via
  Embind `base<>`.
- `rnp_supported_features` returning empty arrays — was passing slugs
  instead of `RNP_FEATURE_*` strings.

### Security

- All cryptography is provided by upstream rnp + Botan. rnp-wasm adds no
  cryptographic code. See `docs/security.md` for threat model.
- 5 Botan CVE fixes inherited by bumping to 3.12.0.

## [Unreleased]

n/a
