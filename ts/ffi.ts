/**
 * ts/ffi.ts
 * FFI handle. Root of every per-keyring state. Owns provider callbacks and
 * is the single factory entry point for Input/Output/Keyring/PacketDump.
 *
 * Refactor (TODO 49): all factories that previously required `rnp.module` now
 * live on Ffi. Consumers never need to touch the module directly.
 *
 * @example
 * ```ts
 * const rnp = await initRnp();
 * using ffi = rnp.createFfi();
 * using input = ffi.input(plaintextBytes);
 * using output = ffi.output();
 * await SignOperation.create(ffi, input, output).execute();
 * const signed = output.bytes();
 * ```
 */

import type { PasswordProvider } from "./providers/password.js";
import type { RnpFfiHandle, RnpModule } from "./module-types.js";
import { Handle } from "./handle.js";
import { Input, Output } from "./io.js";
import { Keyring } from "./keyring.js";
import { PacketDump } from "./dump.js";
import { RnpError } from "./errors.js";
import { type InternalAccess } from "./internal-brand.js";

/**
 * An rnp FFI instance. Each FFI owns a keyring state and is the unit of
 * resource isolation. Multiple FFIs can coexist in one process.
 *
 * Obtain via {@link Rnp.createFfi}. Dispose via `using` (preferred) or
 * explicit `.destroy()`.
 */
export class Ffi extends Handle<RnpFfiHandle> {
  private _keyring?: Keyring;
  private _dump?: PacketDump;
  private readonly module: RnpModule;

  /** @internal constructed via Rnp.createFfi() */
  constructor(module: RnpModule, handle: RnpFfiHandle) {
    super(handle);
    this.module = module;
  }

  // ---- Factories --------------------------------------------------------

  /** Memory-backed Input from raw bytes. */
  input(bytes: Uint8Array): Input {
    return Input._fromBytes(this.module, bytes);
  }

  /** Memory-backed Input from a UTF-8 string (convenience for armored keys). */
  inputFromString(text: string): Input {
    return Input._fromString(this.module, text);
  }

  /** Memory-backed Output that accumulates bytes until `.bytes()` is called. */
  output(): Output {
    return Output._toBytes(this.module);
  }

  /** Idempotent accessor for the keyring facade. */
  get keyring(): Keyring {
    if (!this.isAlive) throw new RnpError("Ffi used after destroy", "RNP_ERROR_BAD_STATE");
    if (!this._keyring) {
      this._keyring = new Keyring(this);
    }
    return this._keyring;
  }

  /** Idempotent accessor for the packet-dump facade. */
  get dump(): PacketDump {
    if (!this.isAlive) throw new RnpError("Ffi used after destroy", "RNP_ERROR_BAD_STATE");
    if (!this._dump) {
      this._dump = new PacketDump(this);
    }
    return this._dump;
  }

  // ---- Provider callbacks ----------------------------------------------

  /**
   * Register a password provider. Called by rnp when a secret key needs to be
   * unlocked. v1: provider must return a string synchronously; async providers
   * require the Asyncify-enabled build (TODO 37).
   */
  setPasswordProvider(provider: PasswordProvider): void {
    this.raw.setPasswordProvider((keyFprint: string, pgpContext: string) => {
      try {
        const result = provider({
          ffi: this,
          keyFingerprint: keyFprint || undefined,
          pgpContext,
        });
        if (result instanceof Promise) {
          console.warn("rnp-wasm: async PasswordProvider requires Asyncify build (TODO 37)");
          return "";
        }
        return result ?? "";
      } catch (e) {
        console.warn("rnp-wasm: PasswordProvider threw:", e);
        return "";
      }
    });
  }

  /**
   * v1 limitation: key provider is wired through to rnp as a no-op callback.
   * Use `keyring.load(...)` for now. Full JS callback routing is TODO 22.
   */
  setKeyProvider(_provider: unknown): void {
    // Pass a stable no-op to Embind. Don't pass null — Embind throws.
    this.raw.setKeyProvider(() => { /* v1 no-op */ });
  }

  // ---- Misc ------------------------------------------------------------

  setTimestamp(t: Date | number | bigint): void {
    const millis = typeof t === "number" ? t :
                   typeof t === "bigint" ? Number(t) : t.getTime();
    this.raw.setTimestamp(Number(Math.floor(millis)));
  }

  /** @internal raw Embind handle — for wrapper classes only. Brand-gated. */
  raw_(_tok: InternalAccess): RnpFfiHandle {
    if (!this.isAlive) throw new RnpError("Ffi used after destroy", "RNP_ERROR_BAD_STATE");
    return this.raw;
  }

  /** @internal the underlying module — for wrapper classes only. Brand-gated. */
  module_(_tok: InternalAccess): RnpModule { return this.module; }
}
