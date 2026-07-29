# API tour

This document walks the public API by domain. For complete type signatures see the TypeDoc output (`docs/api/` after `npm run docs:build`).

## Setup

```typescript
import { initRnp } from "rnp-wasm";

const rnp = await initRnp();
console.log(rnp.versionString());  // e.g. "0.18.1"
```

The WASM module is loaded lazily on the first `initRnp()` call. Subsequent calls reuse the same instance.

## FFI handle and factories

Every per-keyring state is rooted in an `Ffi`. The `Ffi` is also the single factory for `Input`, `Output`, `Keyring`, and `PacketDump` — you never pass the underlying module around.

```typescript
const ffi = rnp.createFfi();
try {
  using input = ffi.input(bytes);          // Uint8Array → Input
  using output = ffi.output();             // empty Output
  const keyring = ffi.keyring;             // idempotent facade
  const dump    = ffi.dump;                // idempotent facade
} finally {
  ffi.destroy();
}
```

Or via `using` (TC39 explicit-resource-management):

```typescript
using ffi = rnp.createFfi();
```

## Keyring

```typescript
const keyring = ffi.keyring;  // Ffi-owned facade

using input = ffi.input(armoredKeyBytes);
keyring.load("GPG", input);

const key = keyring.locate("userid", "alice@example.com");
if (key) {
  console.log(key.fingerprint, key.algorithm, key.bits);
  key.destroy();
}
```

Iterate all loaded keys without prior knowledge of identifiers:

```typescript
for await (const fprint of keyring.identifiers("fingerprint")) {
  console.log(fprint);
}

// Or materialized:
const all = await keyring.allIdentifiers("fingerprint");
```

## Key inspection

```typescript
for (const uid of key.userIds()) {
  console.log("uid:", uid);
}
for (const sub of key.subkeys()) {
  console.log("sub:", sub.fingerprint, sub.curve);
}
```

Unlocking a password-protected secret key:

```typescript
key.unlock(passphrase);
// ... sign / decrypt ...
key.lock();
```

Constant-time fingerprint comparison (useful for trust pinning):

```typescript
if (key.hasFingerprint(expectedHexFingerprint)) {
  // trusted
}
```

Export:

```typescript
const armoredBytes = key.exportToBytes(ffi, { armored: true });
```

## Sign and verify

```typescript
const message = new TextEncoder().encode("hello");
using input = ffi.input(message);
using output = ffi.output();

using op = SignOperation.create(ffi, input, output, "binary")
  .addSignature(signerKey, { hash: "SHA-256" })
  .creationTime(new Date());
op.execute();
const signed = output.bytes();
```

Multi-signer:

```typescript
using op = SignOperation.create(ffi, input, output, "binary")
  .addSignature(signer1)
  .addSignature(signer2, { hash: "SHA-512" });
op.execute();
```

Verification:

```typescript
using vIn = ffi.input(signed);
using vOut = ffi.output();
using vOp = VerifyOperation.create(ffi, vIn, vOut);
const result = vOp.execute();

for (const sig of result.signatures) {
  console.log(sig.valid, sig.signerKeyid, sig.signatureAlgorithm);
}
```

Modes: `"binary"` (inline), `"cleartext"` (cleartext-signed), `"detached"`
(signature separate from message — use `SignOperation.create(..., "detached")`
for signing and `VerifyOperation.createDetached(ffi, message, signature)` for
verifying).

## Encrypt and decrypt

```typescript
// Public-key encryption
using in1 = ffi.input(plaintext);
using out1 = ffi.output();
using eop = EncryptOperation.create(ffi, in1, out1)
  .addRecipient(key)
  .cipher("AES-256")
  .aead("OCB");
eop.execute();
const ciphertext = out1.bytes();

// Password-based encryption
using eop2 = EncryptOperation.create(ffi, in1, out2)
  .addPassword("hunter2", { hash: "SHA-256" });
```

Decryption:

```typescript
using dIn = ffi.input(ciphertext);
using dOut = ffi.output();
// rnp 0.18.1: one-shot decrypt. For encryption metadata use VerifyOperation.
decrypt(ffi, dIn, dOut);
const plaintext = dOut.bytes();
```

## Key generation

```typescript
using op = GenerateOperation.rsa(ffi, 2048, "alice <alice@example.com>")
  .hash("SHA-256")
  .expiration(365 * 24 * 3600);
const key = op.execute();
```

Convenience factories: `GenerateOperation.rsa`, `.ecdsa`, `.eddsa`, `.x25519`.

For full control:

```typescript
using op = GenerateOperation.create(ffi, "ECDSA")
  .curve("NIST P-384")
  .userId("bob <bob@example.com>")
  .addUsage("sign")
  .addUsage("certify");
const key = op.execute();
```

## Packet inspection

```typescript
const dump = ffi.dump.toJson(input);
const parsed = JSON.parse(dump);
// parsed.packets is the rnp-defined structure; we do not transform it.
```

## Provider callbacks (password)

For unlock-on-demand flows, register a password provider on the FFI:

```typescript
ffi.setPasswordProvider(({ keyFingerprint, pgpContext }) => {
  if (pgpContext === "decrypt") {
    return promptUserForPassword(keyFingerprint);
  }
  return null;  // abort
});
```

> **Note:** providers must return synchronously in v1. Async providers (returning a `Promise`) require the Asyncify-enabled build — see TODO 37.

## Registries (OCP)

All algorithm and feature names are validated against a registry. Adding a new algorithm:

```typescript
import { HashAlgorithms } from "rnp-wasm";
HashAlgorithms.register("SHA-1024", "SHA-1024", ["sha1024"]);
```

This makes `op.hash("SHA-1024")` accepted without touching operation code.

## Errors

All rnp failures throw `RnpError`:

```typescript
import { RnpError } from "rnp-wasm";

try {
  op.execute();
} catch (e) {
  if (e instanceof RnpError) {
    console.error(e.code, e.message);
  }
}
```

Common subclasses: `RnpKeyNotFoundError`, `RnpBadPasswordError`, `RnpSignatureInvalidError`.
