# docs/examples/

Worked examples for common rnp-wasm flows. Each file is self-contained TypeScript
that you can adapt into your application.

## Index

- [`sign-and-verify.ts`](sign-and-verify.ts) — binary, cleartext, and detached signing; corresponding verify calls.
- [`encrypt-and-decrypt.ts`](encrypt-and-decrypt.ts) — public-key and password-based encryption.
- [`generate-keys.ts`](generate-keys.ts) — RSA, ECDSA, EdDSA, X25519; with optional passphrase protection.
- [`load-and-export-key.ts`](load-and-export-key.ts) — load an armored key, inspect, export.
- [`worker-pool.ts`](worker-pool.ts) — off-main-thread sign+verify via WorkerPool.

## Running

These examples are written for the published npm package. After `npm install @rnpgp/rnp`:

```sh
# Adjust import paths if you're running against a local build.
npx tsx docs/examples/sign-and-verify.ts
```

The package must be built first (`scripts/build.sh --docker`) so that `dist/rnp.wasm`
exists for `initRnp()` to load.

## Patterns demonstrated

- **Ffi-owned factories**: every example uses `ffi.input(bytes)`, `ffi.output()`,
  `ffi.keyring`, `ffi.dump` — never `Input.fromBytes(rnp.module, ...)`.
- **`using` for explicit resource management**: every Input/Output/Ffi/Op is
  scoped via `using`. Lifetimes are visually obvious.
- **Sync password providers**: every example needing a secret key either unlocks
  explicitly (`key.unlock(pw)`) or registers a sync provider on the FFI.
- **Typed errors**: `RnpError` is caught at the operation level for graceful
  UX.
