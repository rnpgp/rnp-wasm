# AGENTS.md — rnp-wasm contributor guide

Read this before making any change to rnp-wasm. It captures the architectural
invariants that keep the codebase clean as it grows.

## The seven invariants

1. **`Ffi` owns the factories.** Memory-backed `Input` / `Output` are
   constructed via `ffi.input(bytes)` / `ffi.output()`. Never expose
   `Input._fromBytes(module, ...)` outside the wrapper package.

2. **C++ Embind classes don't expose `.constructor<>()`.** JS callers obtain
   instances only via class functions (`Foo.create(...)`) or as return values
   from other methods. Never `new RnpKeyHandle()` from JS — it produces a
   wrapping-nullptr instance that crashes on first method call.

3. **Sub-handles without a destroy function extend `ChildHandle<T>`, not
   `Handle<T, ...>`.** The lifetime contract is documented in `handle.h`:
   `Handle` owns the resource and frees it; `ChildHandle` is a weak
   reference, parent op owns the resource. Examples of `ChildHandle`:
   `rnp_op_sign_signature_t`, `rnp_op_verify_signature_t` (no destroy fn in
   rnp 0.18.1).

4. **Adding an algorithm = registry entry, not a switch statement.** All
   algorithm/feature names live in `ts/registry/algorithm.ts`. Operations
   validate input via `Registry.lookup(name)` and throw on unknown names.
   New algorithms are added with one line. Never add a switch.

5. **AnyInput / AnyOutput unions let operations accept memory-backed OR
   streaming Input/Output interchangeably.** Operations call
   `inputNative(i)` / `outputNative(o)` from `ts/io.ts` exactly once at the
   Embind boundary. Don't cast manually.

6. **Build variants are defined in a single `variants.json`** (planned in
   AUDIT.md H2). All four consumers (CMake, build-deps.sh, build-rnp.sh,
   TS pqc.ts) read from it. Don't encode variant knowledge in scripts.

7. **`module-types.ts` is hand-maintained.** When you change a C++ Embind
   binding, you must also update `module-types.ts`. A codegen test (TODO H1)
   catches drift, but until it lands, manual updates are the contract.

## Lifetime model

```
Rnp (process-wide WASM module)
  └─ Ffi (per-keyring state; explicit destroy or `using`)
      ├─ Input          (Handle<RnpInputHandle> — destroyed on scope exit)
      ├─ Output         (Handle<RnpOutputHandle>)
      ├─ Keyring        (facade — no separate handle)
      ├─ PacketDump     (facade — no separate handle)
      ├─ Key            (Handle<RnpKeyHandle> — owned by keyring? no, caller)
      ├─ SignOperation  (Handle<RnpSignOpHandle>)
      │   └─ SignSignatureHandle   (ChildHandle — owned by SignOp)
      ├─ VerifyOperation
      │   └─ VerifySigHandle       (ChildHandle — owned by VerifyOp)
      ├─ EncryptOperation
      └─ GenerateOperation
              └─ Key                (Handle — owned by caller after execute())
```

- `Handle<T>`: explicit `.destroy()` or use TC39 `using`. FinalizationRegistry
  is defense-in-depth only.
- `ChildHandle<T>`: no destroy method. Lifetime is bound to the parent.
- Facade classes (`Keyring`, `PacketDump`) don't own a handle; they reuse
  the Ffi's. Idempotent accessors.

## Adding a new binding (checklist)

1. **C++**: new file `src/cpp/bindings/<name>.cpp` with its own
   `EMSCRIPTEN_BINDINGS(rnpwasm_<name>)` block. No edits to existing files.
2. **CMake**: append the `.cpp` to `BINDING_SOURCES` in
   `src/cpp/CMakeLists.txt`.
3. **TS**: append handle interface to `ts/module-types.ts`.
4. **TS**: new file `ts/<name>.ts` wrapping the handle.
5. **TS**: export from `ts/index.ts`.
6. **Tests**: at least one `test/node/<name>.test.ts` exercising the wrapper
   via real rnp.
7. **Spec**: if it's a public-facing feature, add to `docs/api.md` and one
   example in `docs/examples/`.

## Don'ts

- Don't bypass `Registry.lookup` for algorithm/feature names.
- Don't call `rnp_*` C functions directly from TS — always go through the
  Embind bindings + TS wrapper.
- Don't use `eval`, `Function()`, or filesystem paths (rnp-wasm forces
  memory-backed I/O via `-sFILESYSTEM=0`).
- Don't add AI attribution to commits, code, or docs.
- Don't commit to `main` or push tags.
- Don't delete source files (per the project-wide rule).

## Spec sources

- `third-party/rnp/include/rnp/rnp.h` — the C API surface we bind
- `third-party/rnp/include/rnp/rnp_err.h` — error codes
- `TODO.complete/00-master-plan.md` — the 63-workstream plan
- `AUDIT.md` — known issues + severity grades
- `docs/architecture.md` — layering overview
- `docs/api.md` — TS API tour

## Build

```
brew install emscripten           # native aarch64 macOS
unset LDFLAGS CPATH LIBRARY_PATH  # avoid Homebrew LLVM contamination
DEPS_PREFIX=$PWD/build/deps RNP_BUILD=$PWD/build/rnp scripts/build-deps.sh
DEPS_PREFIX=$PWD/build/deps RNP_BUILD=$PWD/build/rnp scripts/build-rnp.sh
DEPS_PREFIX=$PWD/build/deps RNP_BUILD=$PWD/build/rnp scripts/build-bindings.sh
```

Output: `dist/rnp.wasm` + `dist/rnp.js`.
