# Changelog

All notable changes to rnp-wasm will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

This file is auto-maintained by [release-please](https://github.com/googleapis/release-please)
based on [Conventional Commits](https://www.conventionalcommits.org/) on `main`.
Do not edit by hand — propose changes via Conventional Commits and let automation update this file.

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
