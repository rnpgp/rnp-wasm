/**
 * ts/pqc.ts
 * PQC algorithm registration. Loaded only in the `rnp-wasm/pqc` subpath.
 *
 * Usage:
 *   import { initRnpPqc } from "rnp-wasm/pqc";
 *   const rnp = await initRnpPqc();
 *
 * This module augments the algorithm registries with post-quantum entries
 * before initializing the WASM module. The actual set of supported algorithms
 * is verified against rnp.supportsFeature at runtime.
 */

import { initRnp } from "./rnp.js";
import { PublicKeyAlgorithms } from "./registry/algorithm.js";

let registered = false;

export function registerPqcAlgorithms(): void {
  if (registered) return;
  registered = true;

  // ML-KEM (Kyber successor) — for encryption
  PublicKeyAlgorithms.register("ML-KEM-768",  "ML-KEM-768",  ["Kyber768"]);
  PublicKeyAlgorithms.register("ML-KEM-1024", "ML-KEM-1024", ["Kyber1024"]);

  // ML-DSA (Dilithium successor) — for signing
  PublicKeyAlgorithms.register("ML-DSA-65",  "ML-DSA-65",  ["Dilithium3"]);
  PublicKeyAlgorithms.register("ML-DSA-87",  "ML-DSA-87",  ["Dilithium5"]);

  // SLH-DSA (SPHINCS+ successor) — hash-based signing
  PublicKeyAlgorithms.register("SLH-DSA-SHA2-128S", "SLH-DSA-SHA2-128S");
  PublicKeyAlgorithms.register("SLH-DSA-SHA2-128F", "SLH-DSA-SHA2-128F");
  PublicKeyAlgorithms.register("SLH-DSA-SHA2-256S", "SLH-DSA-SHA2-256S");
}

export async function initRnpPqc() {
  registerPqcAlgorithms();
  return initRnp();
}
