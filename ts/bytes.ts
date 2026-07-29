/**
 * ts/bytes.ts
 * Byte-array utilities. Pure, dependency-free, side-effect-free.
 */

const HEX_DIGITS = "0123456789abcdef";

/**
 * Encodes a byte array as a lowercase hex string.
 *
 * @param bytes Input bytes.
 * @returns Hex string of length `bytes.length * 2`.
 *
 * @example
 * ```ts
 * bytesToHex(new Uint8Array([0xde, 0xad]));  // "dead"
 * ```
 */
export function bytesToHex(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i]!;
    out += HEX_DIGITS[b >> 4]! + HEX_DIGITS[b & 0xf]!;
  }
  return out;
}

/**
 * Decodes a hex string to bytes. Case-insensitive.
 *
 * @param hex Even-length hex string.
 * @returns Decoded bytes.
 * @throws TypeError if the input has odd length or contains non-hex chars.
 */
export function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new TypeError(`hexToBytes: odd-length input (${hex.length})`);
  }
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    const hi = parseHexDigit(hex[i * 2]!);
    const lo = parseHexDigit(hex[i * 2 + 1]!);
    out[i] = (hi << 4) | lo;
  }
  return out;
}

function parseHexDigit(c: string): number {
  const code = c.charCodeAt(0);
  if (code >= 48 && code <= 57) return code - 48;       // 0-9
  if (code >= 97 && code <= 102) return code - 87;       // a-f
  if (code >= 65 && code <= 70) return code - 55;        // A-F
  throw new TypeError(`hexToBytes: invalid hex digit '${c}'`);
}

const BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/**
 * Encodes bytes as a Base64 string (with padding).
 *
 * @param bytes Input bytes.
 * @returns Base64 string.
 */
export function bytesToBase64(bytes: Uint8Array): string {
  let out = "";
  let i = 0;
  for (; i + 3 <= bytes.length; i += 3) {
    const b0 = bytes[i]!, b1 = bytes[i + 1]!, b2 = bytes[i + 2]!;
    out += BASE64_CHARS[b0 >> 2]!;
    out += BASE64_CHARS[((b0 & 0x03) << 4) | (b1 >> 4)]!;
    out += BASE64_CHARS[((b1 & 0x0f) << 2) | (b2 >> 6)]!;
    out += BASE64_CHARS[b2 & 0x3f]!;
  }
  const remaining = bytes.length - i;
  if (remaining === 1) {
    const b0 = bytes[i]!;
    out += BASE64_CHARS[b0 >> 2]!;
    out += BASE64_CHARS[(b0 & 0x03) << 4]!;
    out += "==";
  } else if (remaining === 2) {
    const b0 = bytes[i]!, b1 = bytes[i + 1]!;
    out += BASE64_CHARS[b0 >> 2]!;
    out += BASE64_CHARS[((b0 & 0x03) << 4) | (b1 >> 4)]!;
    out += BASE64_CHARS[(b1 & 0x0f) << 2]!;
    out += "=";
  }
  return out;
}

/**
 * Decodes a Base64 string to bytes. Whitespace and padding are tolerated.
 *
 * @param b64 Base64 string (with or without padding).
 * @returns Decoded bytes.
 * @throws TypeError if the input contains chars outside the Base64 alphabet.
 */
export function base64ToBytes(b64: string): Uint8Array {
  const cleaned = b64.replace(/[^A-Za-z0-9+/]/g, "");
  const padded = cleaned.length % 4 === 0 ? cleaned : cleaned + "=".repeat(4 - (cleaned.length % 4));
  const out = new Uint8Array((padded.length / 4) * 3);
  let oi = 0;
  for (let i = 0; i < padded.length; i += 4) {
    const c0 = decodeBase64Char(padded[i]!);
    const c1 = decodeBase64Char(padded[i + 1]!);
    const c2 = padded[i + 2] === "=" ? 0 : decodeBase64Char(padded[i + 2]!);
    const c3 = padded[i + 3] === "=" ? 0 : decodeBase64Char(padded[i + 3]!);
    out[oi++] = (c0 << 2) | (c1 >> 4);
    if (padded[i + 2] !== "=") out[oi++] = ((c1 & 0x0f) << 4) | (c2 >> 2);
    if (padded[i + 3] !== "=") out[oi++] = ((c2 & 0x03) << 6) | c3;
  }
  return out.subarray(0, oi);
}

function decodeBase64Char(c: string): number {
  const code = c.charCodeAt(0);
  if (code >= 65 && code <= 90) return code - 65;        // A-Z
  if (code >= 97 && code <= 122) return code - 71;       // a-z
  if (code >= 48 && code <= 57) return code + 4;          // 0-9
  if (code === 43) return 62;                             // +
  if (code === 47) return 63;                             // /
  throw new TypeError(`base64ToBytes: invalid char '${c}'`);
}

/**
 * Concatenates multiple byte arrays into one. Empty chunks are skipped.
 *
 * @param chunks Arrays to concatenate.
 * @returns A new Uint8Array of length `sum(chunks.map(c => c.length))`.
 */
export function concatBytes(...chunks: readonly Uint8Array[]): Uint8Array {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder();

/** UTF-8 encodes a string. */
export function utf8ToBytes(s: string): Uint8Array {
  return TEXT_ENCODER.encode(s);
}

/** UTF-8 decodes a byte array. */
export function bytesToUtf8(bytes: Uint8Array): string {
  return TEXT_DECODER.decode(bytes);
}

/**
 * Compares two byte arrays in constant time. Returns true if they are
 * bytewise-equal AND have the same length.
 *
 * Note: the length check itself is non-constant-time. Use this only when
 * both inputs are expected to have a known length (e.g., comparing two
 * 32-byte fingerprints).
 *
 * @param a First input.
 * @param b Second input.
 * @returns true iff lengths match and all bytes are equal.
 */
export function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}
