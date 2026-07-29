/**
 * ts/internal-brand.ts
 *
 * Symbol-brand check that gates access to internal APIs (`Ffi.raw_()`,
 * `Input._fromBytes()`, etc.). External code can't construct an
 * `InternalAccess` token, so it can't bypass the typed wrappers.
 *
 * See AGENTS.md invariant #2.
 */

export const INTERNAL_TOKEN: unique symbol = Symbol.for("rnp-wasm.internal");

/**
 * Marker type. Only the wrapper files (`io.ts`, `ffi.ts`, `operations/*.ts`)
 * are allowed to import this; it proves to the gate functions that the caller
 * is part of the internal layer.
 */
export type InternalAccess = typeof INTERNAL_TOKEN;
