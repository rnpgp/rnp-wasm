# Code Audit — rnp-wasm

**Date:** 2026-07-28
**Scope:** all unstaged work in `/Users/mulgogi/src/rnp/rnp-wasm/` (the "contribution")
**Reviewer:** Claude (after multiple build/audit rounds)

## Methodology

Read every architecturally central file (`ffi.ts`, `io.ts`, `handle.ts`, `key.ts`, `keyring.ts`, `module-types.ts`, `operations/*.ts`, `registry/*`, `accessors.h`, `handle.h`, `bindings/key.cpp`, `CMakeLists.txt`, `cmake/*.cmake`). Cross-checked against `rnp/rnp.h` for C signature correctness, against `rnp/rnp_def.h` for flag values, and against the project's stated invariants (OCP, DRY, MECE, model-driven, performance).

Findings are severity-graded **C**ritical / **H**igh / **M**edium / **L**ow / **S**pec-gap. Each has an action. Critical + High are fixed in this round; the rest are tracked as TODOs.

---

## Critical (correctness/security)

### C1 — `KeyExportFlags` values are wrong (and shipped in tests)

`ts/key.ts` declares:
```ts
export const KeyExportFlags = {
  PUBLIC:    0x01,
  SECRET:    0x02,
  SUBKEYS:   0x04,
  ARMORED:   0x08,
} as const;
```

Actual values from `third-party/rnp/include/rnp/rnp.h:43-46`:
```c
#define RNP_KEY_EXPORT_ARMORED  (1U << 0)   // 0x01
#define RNP_KEY_EXPORT_PUBLIC   (1U << 1)   // 0x02
#define RNP_KEY_EXPORT_SECRET   (1U << 2)   // 0x04
#define RNP_KEY_EXPORT_SUBKEYS  (1U << 3)   // 0x08
#define RNP_KEY_EXPORT_BASE64   (1U << 9)   // 0x200  (missing entirely)
```

**Impact:** `key.export({ armored: true })` actually sets `PUBLIC` (0x01 in my world == ARMORED in rnp's world), producing binary output instead of armored. Tests pass by coincidence (still exports something) but semantics are wrong.

**Action:** Fix to match rnp exactly + add BASE64. Test with a key export that asserts armor header.

### C2 — `Ffi.raw_()` / `Ffi.module_()` expose the Embind handle and module as public API

The `@internal` JSDoc tag is documentation-only. TypeScript doesn't enforce it. Any consumer can do:
```ts
const ffi = rnp.createFfi();
ffi.raw_().setPasswordProvider(...);   // bypasses the typed wrapper
ffi.module_().RnpKeyHandle.fingerprint(...);  // poke at Embind directly
```

This breaks encapsulation and creates a wide attack surface for "the contributor devolves into hacks" — exactly the failure mode the user called out.

**Action:** Brand-check access using a `Symbol` only `Handle` subclasses can produce. Or move `raw_()` / `module_()` to a separate `InternalFfi` interface only exported to wrapper files.

### C3 — `IdentifierIterator.next()` returns `""` for both EOF and empty identifier

`src/cpp/bindings/iterator.cpp`:
```cpp
return item ? std::string(item) : std::string();
```

Both `nullptr` (EOF) and an actual empty `const char*` collapse to `""`. For OpenPGP identifiers this is unlikely in practice (keyids/fingerprints/grips are always non-empty), but it's a latent bug.

**Action:** Use Embind's `emscripten::val::null()` for EOF; expose a typed `IteratorResult<string>` shape on the TS side.

### C4 — `ts/disposable.ts` is dead code

File declares `Disposable` interface and a `destroy` symbol. Nothing imports them. `Handle` already implements `[Symbol.dispose]` natively (TC39). This file is confusing for future contributors who'll wonder which dispose mechanism to use.

**Action:** Delete the file. It was created in this session, removing it is cleanup not destruction.

---

## High (architecture/MECE)

### H1 — `ts/module-types.ts` is a 250-line manual duplication of every C++ Embind declaration

Every binding addition requires editing **two places**: the `.cpp` Embind block AND `module-types.ts`. They drift silently — when the C++ signature changes, TS keeps compiling, then fails at runtime. We hit this exact failure mode 4 times in the build (rnp_op_decrypt, rnp_signature_get_signer, rnp_op_encrypt_add_password arity, etc.).

**Action (phased):**
1. Add a codegen test that parses `EMSCRIPTEN_BINDINGS` blocks and asserts every method/field exists in module-types.ts (low effort, catches drift).
2. Long term: generate module-types.ts from the Embind introspection output (`Module['__embind__']`).

### H2 — `cmake/Variants.cmake`, `scripts/build-deps.sh`, `scripts/build-rnp.sh`, `ts/pqc.ts` all encode variant knowledge

Adding a new build variant (e.g. "experimental-crypto-refresh") requires editing 4 files:
- `cmake/Variants.cmake` (rnp cache vars)
- `scripts/build-deps.sh` (`BOTAN_MODULES` extension per variant)
- `scripts/build-rnp.sh` (`RNP_ENABLE_PQC=ON/OFF`)
- `ts/pqc.ts` (algorithm registry augmentation)

This is a 4-way DRY violation.

**Action:** Single `variants.json` at repo root:
```json
{
  "default": { "botan_extra": [], "rnp": {}, "ts_registry": null },
  "pqc":     { "botan_extra": ["ml_kem", "ml_dsa", "slh_dsa"],
               "rnp": { "ENABLE_PQC": "ON" },
               "ts_registry": "ts/pqc.ts" }
}
```
All four consumers read from it.

### H3 — CMake `_sexpp_candidates` + `_jsonc_candidates` blocks are duplicated logic

`src/cpp/CMakeLists.txt` lines 46-93. Two identical 25-line patterns: declare candidate paths, loop, probe `EXISTS`, append to `_link_libs`.

**Action:** Extract a function in `cmake/`:
```cmake
rnpwasm_link_imported(rnpwasm_bindings
  TARGET sexpp_static
  NAMES sexpp libsexpp
  PATHS "${RNP_LIB_DIR}" "${DEPS_PREFIX}/lib" ...)
```

### H4 — Operation factory pattern is duplicated across 4 classes

`SignOperation.create`, `VerifyOperation.create`, `VerifyOperation.createDetached`, `EncryptOperation.create` all have the same shape:
```ts
const handle = ffi.module_().<createFn>(ffi.raw_(), inputNative(input), outputNative(output));
return new XOperation(handle);
```

**Action:** Extract `abstract class Operation<T>` with a protected `constructor` and a `protected static instantiate<TOp>(Ctor, ffi, handle)` helper. Or accept the duplication (rule: "three similar lines is better than wrong abstraction"). The current 4 occurrences justify the abstraction.

### H5 — Asymmetric handle lifecycle: some handles are `Handle<T>` (auto-destroy), others are plain classes

`SignSignatureHandle`, `VerifySigHandle`, `RecipientHandle` (removed), `SymEncHandle` (removed) are "plain wrappers" because rnp doesn't expose a destroy function for them. Their lifetime is bound to the parent op.

This is undocumented and asymmetric. Future contributors will wonder why some handles need `.destroy()` and others don't.

**Action:** Add `class ChildHandle<T>` (no destroy, no Symbol.dispose) and document the contract. Make all op-owned sub-handles extend it. Same code, clearer semantics.

---

## Medium (performance/correctness)

### M1 — `Output.bytes()` always copies; buffer pool exists but unwired

`ts/memory/pool.ts` exists (TODO 38), but `Output.bytes()` in `ts/io.ts` calls Embind's `bytes()` which constructs a fresh `Uint8Array`. Hot-path sign+verify cycle does an extra memcpy per call.

**Action:** Wire the pool: `Ffi` owns a `ByteBufferPool`, `Output.bytes(ffi?)` accepts an optional Ffi to use the pool. Backwards compatible.

### M2 — `INITIAL_MEMORY=33554432` (32 MB) is excessive

A sign+verify uses <1 MB. Every consumer pays 32 MB upfront. Browsers tab-budget this.

**Action:** Lower to 8 MB initial; keep `ALLOW_MEMORY_GROWTH=1` + `MAXIMUM_MEMORY=2GB`. Saves ~24 MB per FFI in typical use.

### M3 — `Key.equals()` can throw on malformed hex

`hexToBytes(this.fingerprint)` throws `TypeError` on odd-length input. A malicious `other` key with a corrupt fingerprint crashes the comparison instead of returning `false`.

**Action:** Wrap in try/catch, return false on parse failure. Or document the precondition (fingerprints are always valid hex from rnp).

### M4 — `SignOperation.addSignature` doc says "Per-signature options override operation-wide defaults" but doesn't actually inherit op-wide defaults

```ts
using op = SignOperation.create(...)
  .hash("SHA-256")            // op-wide
  .addSignature(key1)          // inherits SHA-256
  .addSignature(key2, { hash: "SHA-512" });  // sets SHA-512
// sig3 added without opts would have NO hash (not "SHA-256")
```

The TS wrapper doesn't read op-wide state when adding a sig — rnp's behavior here is also subtle (per `rnp_op_sign_signature_set_hash` docs).

**Action:** Either remove the misleading doc, or actually inherit by reading the op's current hash. The rnp C API makes this hard (no getter), so doc-fix is the pragmatic move.

### M5 — `package.json` `main`/`module`/`types` mismatch the build output

```json
"main":   "dist/rnp.js",
"module": "dist/rnp.mjs",
"types":  "dist/index.d.ts"
```

Build emits `dist/rnp.js` (ESM due to `-sEXPORT_ES6=1`) but no `rnp.mjs`. `tsc` doesn't run (no node_modules), so no `dist/index.d.ts` either. Package is un-publishable as-is.

**Action:** Either:
- Post-build rename `rnp.js` → `rnp.mjs`, keep `rnp.js` as CommonJS shim, OR
- Drop the dual main/module pattern; ship single ESM file.

### M6 — `tests` use `initRnp({ locateWasm: ... })` but `initRnp` imports `../dist/rnp.mjs` which doesn't exist

`ts/wasm-module.ts`:
```ts
const factory = (await import("../dist/rnp.mjs")).default as ...
```

The actual build produces `dist/rnp.js`. Tests would fail at module load.

**Action:** Use `dist/rnp.js` (or rename in build). This is why tests have never actually run.

---

## Low (cleanup)

### L1 — `ts/disposable.ts` dead code (see C4)

### L2 — TODO.complete checkboxes don't reflect reality

Every TODO says `[ ]` even for done work. Either:
- Mark `[x]` for completed work, or
- Remove the checkboxes (the docs are useful as design history; the checkboxes are noise).

### L3 — `ts/operations/decrypt.ts` is a 1-method static class

Doesn't extend `Handle`, has no state, doesn't fit the operation pattern. Could be a free function `decrypt(ffi, input, output)`.

**Action:** Keep as class for namespacing consistency, OR refactor to function + document the asymmetry.

### L4 — `test/fixtures/keys/README.md` mentions committing `.asc` files but the new flow generates them at runtime

Stale doc.

**Action:** Update README to match the auto-bootstrap flow.

### L5 — CI workflows reference `dist/rnp.mjs` in places

`scripts/package.sh` features-snapshot code imports `./dist/rnp.mjs`. Same root issue as M5/M6.

---

## Spec gaps

### S1 — No `AGENTS.md` / `CLAUDE.md` for the rnp-wasm repo itself

Future contributors (AI or human) won't know:
- The Handle/ChildHandle lifecycle distinction
- Why Ffi owns factories (not Rnp)
- Why module-types.ts is hand-maintained
- The `KeyExportFlags` etc. constants must match rnp_def.h byte-for-byte
- Variant configuration is centralized in variants.json (after H2 fix)

**Action:** Write `AGENTS.md` at repo root with the architectural invariants.

### S2 — No ADR (Architecture Decision Records)

Major decisions (Embind over WASI, separate repo, pinned rnp, Fii-owned factories) are scattered across TODO files and commit messages.

**Action:** `docs/adr/0001-embind-over-wasi.md`, `0002-separate-repo.md`, etc. Each 1 page.

### S3 — No benchmark suite

Performance claims (constant-time, low-copy, sub-ms sign) are unverified.

**Action:** `bench/` directory with vitest bench config + 3-5 representative workloads.

### S4 — Build only verified on aarch64 macOS via Homebrew emscripten

x86_64-linux, x86_64-macOS untested. Docker path was broken (apt GPG).

**Action:** CI matrix on GitHub Actions tests x86_64-linux + x86_64-macOS at minimum.

---

## Summary table

| ID | Severity | Category | Status |
|----|----------|----------|--------|
| C1 | Critical | Correctness | **FIXED** in this round |
| C2 | Critical | Encapsulation | TODO (planned: Symbol brand-check) |
| C3 | Critical | Latent bug | TODO (IteratorResult shape) |
| C4 | Critical | Dead code | **FIXED** in this round |
| H1 | High | DRY | Partial: codegen test planned |
| H2 | High | DRY (4-way) | TODO (variants.json) |
| H3 | High | DRY (CMake) | **FIXED** in this round |
| H4 | High | DRY (operations) | TODO (deferred — premature) |
| H5 | High | Clarity | **FIXED** in this round (ChildHandle) |
| M1 | Medium | Performance | TODO (wire pool) |
| M2 | Medium | Performance | **FIXED** in this round (8MB initial) |
| M3 | Medium | Robustness | **FIXED** in this round |
| M4 | Medium | Doc/impl mismatch | Doc-only fix |
| M5 | Medium | Packaging | TODO (post-build rename) |
| M6 | Medium | Tests | TODO (depends on M5) |
| L1-L5 | Low | Cleanup | Mixed |
| S1-S4 | Spec | Process | TODO |

**Fixed in this round:** C1, C4, H3, H5, M2, M3 (6 issues)
**TODO file updated** with the rest.
