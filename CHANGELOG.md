# Changelog

All notable changes to rnp-wasm will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

This file is auto-maintained by [release-please](https://github.com/googleapis/release-please)
based on [Conventional Commits](https://www.conventionalcommits.org/) on `main`.
Do not edit by hand — propose changes via Conventional Commits and let automation update this file.

## 1.0.0 (2026-07-29)


### Features

* ship worker pool as part of public API; remove stale Roadmap ([65c53d0](https://github.com/rnpgp/rnp-wasm/commit/65c53d0aa510b407dfb736905a13c96c834eacf8))


### Bug Fixes

* **0.1.1:** exclude async variant + unused internals from tarball ([6ca39ed](https://github.com/rnpgp/rnp-wasm/commit/6ca39ed3589c94da91454373310a8732fae993e4))
* **0.1.1:** ship the actual public API + TypeScript types ([412739a](https://github.com/rnpgp/rnp-wasm/commit/412739a62a81f1deb4111ece547048cfa09aa27f))
* **bindings:** cast uint64_t timestamp to double for Embind ([b7b4c80](https://github.com/rnpgp/rnp-wasm/commit/b7b4c80d96808f4a617f207b7cb73187ed62fec7))
* **ci:** consolidate PR checks into single workflow + syntax fixes ([87618f3](https://github.com/rnpgp/rnp-wasm/commit/87618f358f2f6d4d7e88876c1f153fa5e1daa4fb))
* **ci:** make /opt/rnp-wasm world-writable in Docker image ([b51490d](https://github.com/rnpgp/rnp-wasm/commit/b51490d54024416f4b46d438173d089f79e1ce87))
* **ci:** set HOME=/tmp in Docker image ([0c3c1b9](https://github.com/rnpgp/rnp-wasm/commit/0c3c1b9989705585320324f979d6a2e4d752cdc2))
* don't rely on Module.err being exposed in Emscripten 6.x ([89e1022](https://github.com/rnpgp/rnp-wasm/commit/89e1022515cbf58f66b6ceeabbbef3a9259c581b))
* **package:** drop publishConfig.provenance for local publish ([3086e8a](https://github.com/rnpgp/rnp-wasm/commit/3086e8ad73751565ce6d8efbe1590ad184de9fcd))
* **test:** make browser harness serveable by vite preview ([d45d120](https://github.com/rnpgp/rnp-wasm/commit/d45d1205b1c0c4616a5cdd56462a21366dc1fc04))

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
