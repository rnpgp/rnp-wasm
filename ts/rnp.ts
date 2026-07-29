/**
 * ts/rnp.ts
 * Top-level Rnp class. Holds the loaded WASM module; spawns FFI instances.
 *
 * Lifecycle:
 *   const rnp = await initRnp();
 *   const ffi = rnp.createFfi();      // creates an FFI handle
 *   // ... use ffi ...
 *   ffi.destroy();
 *
 * The module itself lives for the lifetime of the process; calling initRnp()
 * multiple times returns distinct Rnp instances but shares the underlying
 * WASM heap.
 */

import { loadModule, type InitOptions } from "./wasm-module.js";
import type { RnpModule } from "./module-types.js";
import { Ffi } from "./ffi.js";

export class Rnp {
  private constructor(public readonly module: RnpModule) {}

  static async create(opts: InitOptions = {}): Promise<Rnp> {
    const module = await loadModule(opts);
    return new Rnp(module);
  }

  createFfi(): Ffi {
    const handle = this.module.RnpFfiHandle.create("GPG", "GPG");
    return new Ffi(this.module, handle);
  }

  versionString(): string { return this.module.rnpVersionString(); }
  versionStringFull(): string { return this.module.rnpVersionStringFull(); }
  version(): number { return this.module.rnpVersion(); }
  versionCommitTimestamp(): bigint { return this.module.rnpVersionCommitTimestamp(); }

  supportsFeature(type: string, name: string): boolean {
    return this.module.rnpSupportsFeature(type, name);
  }

  /**
   * Returns the raw JSON string from rnp_supported_features.
   * Consumers can JSON.parse if they want structured data.
   */
  supportedFeatures(type: string): string {
    try {
      return this.module.rnpSupportedFeatures(type);
    } catch {
      // rnp_supported_features may return BAD_PARAMETERS in some builds.
      // Return empty array so registry cross-check degrades gracefully.
      return "[]";
    }
  }

  calculateIterations(hash: string, msec: bigint): number {
    return this.module.rnpCalculateIterations(hash, msec);
  }

  /**
   * Returns the bootstrap features JSON document. Includes rnp version and
   * every supported feature type (symmetric, asymmetric, hash, aead, etc.).
   * Useful for build-time introspection without round-tripping into rnp.
   */
  bootstrapFeatures(): string {
    return this.module.rnpBootstrapFeatures();
  }

  /**
   * Parsed `bootstrapFeatures()`. Memoized.
   */
  features(): Record<string, unknown> {
    if (!this._featuresCache) {
      this._featuresCache = JSON.parse(this.bootstrapFeatures()) as Record<string, unknown>;
    }
    return this._featuresCache;
  }

  private _featuresCache?: Record<string, unknown>;
}

/** Async factory exported as the package entry point. */
export async function initRnp(opts?: InitOptions): Promise<Rnp> {
  return Rnp.create(opts);
}

export type { Ffi } from "./ffi.js";
