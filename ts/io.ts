/**
 * ts/io.ts
 * Public Input/Output wrappers around the Embind handles.
 *
 * Architectural invariant (see AGENTS.md):
 *   Operations accept `AnyInput`/`AnyOutput` and call `inputNative`/`outputNative`
 *   exactly once at the Embind boundary. No manual casts.
 *   InputLike / OutputLike are structural interfaces; both Input and StreamInput
 *   implement them so unions are type-safe without `as unknown as`.
 */

import type { RnpInputHandle, RnpModule, RnpOutputHandle } from "./module-types.js";
import { Handle } from "./handle.js";
import { bytesToUtf8, utf8ToBytes } from "./bytes.js";

/** Structural contract any rnp_input_t-shaped wrapper must satisfy. */
export interface InputLike {
  readonly raw: RnpInputHandle;
}

/** Structural contract for rnp_output_t-shaped wrappers. */
export interface OutputLike {
  readonly raw: RnpOutputHandle;
}

/** Anything that satisfies InputLike. */
export type AnyInput = Input | StreamInput;
/** Anything that satisfies OutputLike. */
export type AnyOutput = Output | StreamOutput;

import type { StreamInput } from "./streams.js";
import type { StreamOutput } from "./streams.js";
export type { StreamInput, StreamOutput };

/**
 * Memory-backed Input. Construct via `ffi.input(bytes)`.
 */
export class Input extends Handle<RnpInputHandle> implements InputLike {
  /** @internal constructed via Ffi.input(...) */
  constructor(handle: RnpInputHandle) {
    super(handle);
  }

  /** @internal module-aware factory used by Ffi */
  static _fromBytes(module: RnpModule, data: Uint8Array): Input {
    const ptr = module._malloc(data.byteLength);
    if (ptr === 0) throw new Error("rnp-wasm: out of memory in Input._fromBytes");
    module.HEAPU8.set(data, ptr);
    try {
      const handle = module.RnpInputHandle.fromBytes(ptr, data.byteLength);
      return new Input(handle);
    } finally {
      module._free(ptr);
    }
  }

  /** @internal */
  static _fromString(module: RnpModule, text: string): Input {
    return Input._fromBytes(module, utf8ToBytes(text));
  }
}

/**
 * Memory-backed Output. Accumulates bytes; retrieve via `.bytes()`.
 */
export class Output extends Handle<RnpOutputHandle> implements OutputLike {
  /** @internal constructed via Ffi.output() */
  constructor(handle: RnpOutputHandle) {
    super(handle);
  }

  /** @internal module-aware factory used by Ffi */
  static _toBytes(module: RnpModule): Output {
    return new Output(module.RnpOutputHandle.toBytes());
  }

  /** Returns a fresh Uint8Array copy of the produced bytes. */
  bytes(): Uint8Array {
    return this.raw.bytes();
  }

  /** Convenience: bytes decoded as UTF-8. */
  override toString(): string {
    return bytesToUtf8(this.bytes());
  }
}

/**
 * Internal helper: extract the Embind handle from any InputLike.
 * Type-safe via the structural interface — no `as unknown as` cast.
 * @internal
 */
export function inputNative(i: InputLike): RnpInputHandle {
  return i.raw;
}

/** @internal — same shape for Output. */
export function outputNative(o: OutputLike): RnpOutputHandle {
  return o.raw;
}
