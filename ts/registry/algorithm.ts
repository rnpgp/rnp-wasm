/**
 * ts/registry/algorithm.ts
 * Registries for OpenPGP algorithm names. Each value is the rnp-recognized
 * string (as documented in `rnp_supported_features`). Aliases cover common
 * spellings (e.g., "AES256", "AES-256", "aes256").
 */

import { Registry } from "./registry.js";

export type PublicKeyAlgorithm = string;
export type SymmetricAlgorithm = string;
export type HashAlgorithm = string;
export type CompressionAlgorithm = string;
export type AeadAlgorithm = string;
export type CurveName = string;

export const PublicKeyAlgorithms = new Registry<PublicKeyAlgorithm>();
// Canonical names match rnp's RNP_ALGNAME_* defines (rnp/rnp.h).
// RSA-ENCRYPT / RSA-SIGN are deprecated subtypes (RFC 9580 calls them RSA
// only); not listed in rnp_supported_features, so we omit them from the
// registry. PGP_PKA_ED25519 and PGP_PKA_X25519 are the Crypto-Refresh variants
// (requires ENABLE_CRYPTO_REFRESH=ON).
PublicKeyAlgorithms.register("RSA", "RSA", ["rsa"]);
PublicKeyAlgorithms.register("DSA", "DSA", ["dsa"]);
PublicKeyAlgorithms.register("ELGAMAL", "ELGAMAL", ["eg", "elgamal"]);
PublicKeyAlgorithms.register("ECDH", "ECDH", ["ecdh"]);
PublicKeyAlgorithms.register("ECDSA", "ECDSA", ["ecdsa"]);
PublicKeyAlgorithms.register("EDDSA", "EDDSA", ["ed25519", "eddsa"]);
PublicKeyAlgorithms.register("ED25519", "ED25519", ["ed25519-cr"]);
PublicKeyAlgorithms.register("X25519", "X25519", ["cv25519"]);
PublicKeyAlgorithms.register("SM2", "SM2", ["sm2", "gm"]);
// PQC slots registered only in pqc variant build (TODO 40).

export const SymmetricAlgorithms = new Registry<SymmetricAlgorithm>();
// Canonical names match rnp's RNP_ALGNAME_* defines (no hyphens in AES/CAMELLIA).
// ChaCha20Poly1305 is registered as an AEAD algorithm only (see AeadAlgorithms
// below) — rnp doesn't expose a raw ChaCha20 stream cipher in its FFI.
for (const [name, aliases] of [
  ["AES128", ["aes128", "AES-128"]],
  ["AES192", ["aes192", "AES-192"]],
  ["AES256", ["aes256", "AES-256"]],
  ["CAMELLIA128", ["camellia128", "CAMELLIA-128"]],
  ["CAMELLIA192", ["camellia192", "CAMELLIA-192"]],
  ["CAMELLIA256", ["camellia256", "CAMELLIA-256"]],
  ["TWOFISH", ["twofish"]],
  ["BLOWFISH", ["blowfish"]],
  ["CAST5", ["cast5"]],
  ["IDEA", ["idea"]],
  ["TRIPLEDES", ["tripledes", "des-ede3", "3DES"]],
  ["SM4", ["sm4"]],
] as const) {
  SymmetricAlgorithms.register(name, name, aliases);
}

export const HashAlgorithms = new Registry<HashAlgorithm>();
// Canonical names match rnp's RNP_ALGNAME_* defines (rnp/rnp.h):
//   SHA1, SHA224, SHA256, SHA384, SHA512, SHA3-256, SHA3-512, ...
// NOT "SHA-256" — rnp's str_to_hash_alg rejects hyphenated SHA2 names.
// SHA-512/256 is not in rnp 0.18.1's hash_alg_map; omitted.
for (const [name, aliases] of [
  ["SHA1", ["sha1", "SHA-1"]],
  ["SHA224", ["sha224", "SHA-224"]],
  ["SHA256", ["sha256", "SHA-256"]],
  ["SHA384", ["sha384", "SHA-384"]],
  ["SHA512", ["sha512", "SHA-512"]],
  ["SHA3-256", ["sha3_256"]],
  ["SHA3-512", ["sha3_512"]],
  ["MD5", ["md5"]],
  ["RIPEMD160", ["ripemd160", "RIPEMD-160"]],
  ["SM3", ["sm3"]],
] as const) {
  HashAlgorithms.register(name, name, aliases);
}

export const CompressionAlgorithms = new Registry<CompressionAlgorithm>();
CompressionAlgorithms.register("UNCOMPRESSED", "UNCOMPRESSED", ["none", "uncompressed"]);
CompressionAlgorithms.register("ZIP", "ZIP", ["zip"]);
CompressionAlgorithms.register("ZLIB", "ZLIB", ["zlib"]);
CompressionAlgorithms.register("BZIP2", "BZIP2", ["bzip2", "bz2"]);

export const AeadAlgorithms = new Registry<AeadAlgorithm>();
// rnp 0.18.1 supports EAX and OCB AEAD only. GCM was added in RFC 9580 but
// rnp doesn't expose it yet; omit until rnp_supported_features lists it.
AeadAlgorithms.register("NONE", "NONE", ["none"]);
AeadAlgorithms.register("EAX", "EAX", ["eax"]);
AeadAlgorithms.register("OCB", "OCB", ["ocb"]);

export const Curves = new Registry<CurveName>();
// Curve names match rnp's ec_curves.cpp — note X25519 is exposed as the
// algorithm PGP_PKA_X25519, not as a curve. Curve25519 here is the
// Montgomery curve used by X25519 keys.
Curves.register("NIST P-256", "NIST P-256", ["secp256r1", "prime256v1", "P-256"]);
Curves.register("NIST P-384", "NIST P-384", ["secp384r1", "P-384"]);
Curves.register("NIST P-521", "NIST P-521", ["secp521r1", "P-521"]);
Curves.register("brainpoolP256r1", "brainpoolP256r1", ["brainpoolP256"]);
Curves.register("brainpoolP384r1", "brainpoolP384r1", ["brainpoolP384"]);
Curves.register("brainpoolP512r1", "brainpoolP512r1", ["brainpoolP512"]);
Curves.register("Ed25519", "Ed25519", ["ed25519"]);
Curves.register("Curve25519", "Curve25519", ["curve25519", "cv25519", "X25519"]);
Curves.register("secp256k1", "secp256k1", ["secp256k1"]);
Curves.register("SM2 P-256", "SM2 P-256", ["sm2p256v1"]);
