/**
 * ts/handle.ts
 * Abstract base for all rnp opaque-handle wrappers.
 *
 * - Owns an Embind handle instance from the C++ layer.
 * - Explicit `destroy()` is idempotent.
 * - `FinalizationRegistry` as defense-in-depth (do NOT rely on it in production
 *   code paths — JS GC is non-deterministic).
 *
 * Supports the TC39 explicit-resource-management protocol via
 * `[Symbol.dispose]`, so callers can use `using` declarations.
 */

import { RnpError } from "./errors.js";

const registry = new FinalizationRegistry((destroy: () => void) => {
  try { destroy(); } catch { /* swallow — finalizer must not throw */ }
});

/**
 * Abstract base for classes wrapping an Embind handle.
 *
 * @example
 * ```ts
 * using key = keyring.mustLocate("userid", "alice");
 * // ... use key ...
 * // key.destroy() runs automatically at end of scope.
 * ```
 */
export abstract class Handle<T extends { _destroy: () => void }> {
  private destroyed = false;
  private readonly ptr: T;

  /**
   * @param ptr The Embind handle. Implementations obtain this from a
   *            class function or factory method on the underlying module.
   * @internal
   */
  protected constructor(ptr: T) {
    this.ptr = ptr;
    registry.register(this, () => this.destroy(), this);
  }

  /** @internal Raw Embind handle. Throws if destroyed. */
  get raw(): T {
    if (this.destroyed) {
      throw new RnpError("use-after-destroy on rnp handle", "RNP_ERROR_BAD_STATE");
    }
    return this.ptr;
  }

  /**
   * Releases the underlying rnp resource. Idempotent — safe to call multiple
   * times. After destroy(), accessing any method on the instance throws.
   */
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    registry.unregister(this);
    try {
      this.ptr._destroy();
    } catch {
      // Embind throws if the underlying C++ object was already freed via the
      // move-constructor path; safe to swallow on cleanup.
    }
  }

  /** True until `destroy()` is called. */
  get isAlive(): boolean {
    return !this.destroyed;
  }

  /** TC39 explicit-resource-management hook. Equivalent to `destroy()`. */
  [Symbol.dispose](): void {
    this.destroy();
  }
}
