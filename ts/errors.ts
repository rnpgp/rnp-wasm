/**
 * ts/errors.ts
 * Typed error hierarchy for rnp-wasm.
 *
 * rnp returns rnp_result_t codes; the C++ layer translates non-success codes
 * to std::runtime_error which Embind surfaces as a generic JS Error. This
 * module provides an RnpError class with the rnp code preserved as a property.
 */

/**
 * Union of known rnp result-code string identifiers. Use `string` as the
 * operational type when reading codes at runtime — rnp may add codes in
 * future releases. The literal union is exported as `RnpErrorCodeKnown`
 * for callers that want to discriminate against known values.
 */
export type RnpErrorCodeKnown =
  | "RNP_SUCCESS"
  | "RNP_ERROR_GENERIC"
  | "RNP_ERROR_BAD_FORMAT"
  | "RNP_ERROR_BAD_PARAMETERS"
  | "RNP_ERROR_NOT_IMPLEMENTED"
  | "RNP_ERROR_NOT_SUPPORTED"
  | "RNP_ERROR_OUT_OF_MEMORY"
  | "RNP_ERROR_SHORT_BUFFER"
  | "RNP_ERROR_NULL_POINTER"
  | "RNP_ERROR_ACCESS"
  | "RNP_ERROR_READ"
  | "RNP_ERROR_WRITE"
  | "RNP_ERROR_BAD_STATE"
  | "RNP_ERROR_MAC_INVALID"
  | "RNP_ERROR_SIGNATURE_INVALID"
  | "RNP_ERROR_KEY_GENERATION"
  | "RNP_ERROR_BAD_PASSWORD"
  | "RNP_ERROR_KEY_NOT_FOUND"
  | "RNP_ERROR_NOT_FOUND"
  | "RNP_ERROR_NO_SUITABLE_KEY"
  | "RNP_ERROR_DECRYPT_FAILED"
  | "RNP_ERROR_NO_SIGNATURES_FOUND"
  | "RNP_ERROR_BAD_DATA"
  | "RNP_ERROR_CANCELLED";

export type RnpErrorCode = RnpErrorCodeKnown | (string & {});

/**
 * Error thrown by every rnp-wasm code path on failure. Preserves the rnp
 * result code as a typed `code` property.
 *
 * @example
 * ```ts
 * try {
 *   op.execute();
 * } catch (e) {
 *   if (e instanceof RnpError) console.error(e.code, e.message);
 * }
 * ```
 */
export class RnpError extends Error {
  /**
   * @param message  Human-readable description.
   * @param code     rnp result-code identifier.
   * @param options  Standard Error options (e.g., `cause`).
   */
  constructor(
    message: string,
    public readonly code: RnpErrorCode = "RNP_ERROR_GENERIC",
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "RnpError";
  }
}

/** Thrown when a key lookup (locate, mustLocate) fails. */
export class RnpKeyNotFoundError extends RnpError {
  /** @param identifier Human-readable identifier (e.g., `"userid=alice@x"`). */
  constructor(identifier: string) {
    super(`Key not found: ${identifier}`, "RNP_ERROR_KEY_NOT_FOUND");
    this.name = "RnpKeyNotFoundError";
  }
}

/** Thrown when a key-unlock or decrypt operation is given the wrong password. */
export class RnpBadPasswordError extends RnpError {
  constructor() {
    super("Bad password", "RNP_ERROR_BAD_PASSWORD");
    this.name = "RnpBadPasswordError";
  }
}

/** Thrown when verification reports an invalid signature. */
export class RnpSignatureInvalidError extends RnpError {
  /** @param signer Optional signer identifier (keyid or fingerprint). */
  constructor(signer?: string) {
    super(`Signature invalid${signer ? ` (signer: ${signer})` : ""}`, "RNP_ERROR_SIGNATURE_INVALID");
    this.name = "RnpSignatureInvalidError";
  }
}

/**
 * Asserts that a numeric rnp result code is RNP_SUCCESS (0).
 * Throws RnpError on any non-zero value.
 *
 * @param code rnp result code (0 = success).
 * @param ctx  Optional human-readable context prefix for the error message.
 * @throws RnpError when code is non-zero.
 */
export function assertRnpSuccess(code: number, ctx?: string): void {
  if (code !== 0) {
    throw new RnpError(
      `${ctx ?? "rnp call failed"} (code=${code})`,
      `RNP_ERROR_CODE_${code}`,
    );
  }
}

/**
 * Wraps an Embind-thrown JS Error into an RnpError. Rethrows other errors
 * unchanged. Always throws.
 *
 * @param e   The caught value.
 * @param ctx Optional human-readable context prefix.
 */
export function wrapEmbindError(e: unknown, ctx?: string): never {
  if (e instanceof RnpError) throw e;
  if (e instanceof Error) {
    throw new RnpError(`${ctx ? ctx + ": " : ""}${e.message}`);
  }
  throw new RnpError(`${ctx ?? "unknown error"}: ${String(e)}`);
}
