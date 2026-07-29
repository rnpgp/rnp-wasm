/**
 * ts/index.ts
 * Public entry point. Re-exports the public surface.
 */

export { initRnp, Rnp } from "./rnp.js";
export { Ffi } from "./ffi.js";
export { Keyring } from "./keyring.js";
export type { KeyFormat, KeyIdentifierType, IdentifierItemType, ImportResult } from "./keyring.js";
export { Key, KeyExportFlags } from "./key.js";
export type {
  KeyExportOptions, KeyRevocationOptions, AddUidOptions, RevocationReasonCode,
} from "./key.js";
export { Uid } from "./uid.js";
export { Signature } from "./signature.js";
export { Input, Output } from "./io.js";
export type { AnyInput, AnyOutput } from "./io.js";
export { PacketDump } from "./dump.js";
export { IdentifierIterator } from "./identifier-iterator.js";
export { StreamInput, StreamOutput } from "./streams.js";
export type { SyncReader, SyncWriter } from "./streams.js";
export {
  assertRnpSuccess,
  RnpError,
  RnpKeyNotFoundError,
  RnpBadPasswordError,
  RnpSignatureInvalidError,
} from "./errors.js";
export type { RnpErrorCode } from "./errors.js";

export { SignOperation } from "./operations/sign.js";
export type { SignMode, SignatureConfig } from "./operations/sign.js";
export { VerifyOperation } from "./operations/verify.js";
export type { VerifyResult, VerifiedSignature } from "./operations/verify.js";
export { EncryptOperation } from "./operations/encrypt.js";
export type { PasswordEncryptionOptions } from "./operations/encrypt.js";
export { decrypt } from "./operations/decrypt.js";
export { GenerateOperation } from "./operations/generate.js";
export type { GenerateOptions } from "./operations/generate.js";

// Worker pool: opt-in. Importing WorkerPool pulls in comlink (a runtime dep).
// Bundlers will also pull dist/worker.js as a separate Web Worker chunk via
// the new Worker(new URL("./worker.js", import.meta.url)) pattern in pool.ts.
// Requires a modern bundler (Vite, webpack 5+) that understands that pattern.
export { WorkerPool } from "./pool.js";
export type { WorkerPoolOptions, WorkerApi } from "./pool.js";

export {
  PublicKeyAlgorithms,
  SymmetricAlgorithms,
  HashAlgorithms,
  CompressionAlgorithms,
  AeadAlgorithms,
  Curves,
} from "./registry/algorithm.js";
export { FeatureTypes } from "./registry/feature.js";

export type { PasswordProvider, PasswordContext } from "./providers/password.js";
export type { KeyProvider, KeyLookupContext } from "./providers/key.js";

export * from "./bytes.js";
