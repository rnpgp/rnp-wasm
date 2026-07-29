/**
 * ts/streams.ts
 * Streaming Input/Output via rnp_input_from_callback / rnp_output_to_callback.
 *
 * v1: sync callbacks only. The reader/writer functions receive a Uint8Array
 * view into the WASM heap and must return synchronously. rnp copies bytes
 * out of the view before returning, so the JS caller can reuse the buffer.
 *
 * Async streaming (WHATWG ReadableStream / WritableStream) requires Asyncify
 * (TODO 37) so the C call stack can pause while waiting for the next chunk.
 * Until then, callers needing async streaming should buffer externally.
 */

import type { Ffi } from "./ffi.js";
import type { RnpStreamInputHandle, RnpStreamOutputHandle } from "./module-types.js";
import { Handle } from "./handle.js";
import { INTERNAL_TOKEN } from "./internal-brand.js";

/**
 * A sync reader: rnp hands you a heap view of length `len` and you must fill
 * some prefix of it and return the number of bytes written.
 *
 * Return `null` to signal EOF.
 *
 * @param buf   Writable view into WASM heap. Valid only for the duration of the call.
 * @returns Number of bytes written (0 < n <= buf.length), or null at EOF.
 */
export type SyncReader = (buf: Uint8Array) => number | null;

/**
 * A sync writer: rnp hands you a read-only view of the bytes it just produced.
 *
 * @param chunk Read-only view into WASM heap. Valid only for the duration of the call.
 * @returns true if accepted; false to abort the operation.
 */
export type SyncWriter = (chunk: Uint8Array) => boolean;

/**
 * Memory-backed Input backed by a sync reader callback.
 *
 * @example
 * ```ts
 * const input = StreamInput.create(ffi, (buf) => {
 *   const n = Math.min(buf.length, source.remaining);
 *   if (n === 0) return null;
 *   buf.set(source.nextChunk(n));
 *   return n;
 * });
 * ```
 */
export class StreamInput extends Handle<RnpStreamInputHandle> {
  private constructor(handle: RnpStreamInputHandle) { super(handle); }

  static create(ffi: Ffi, reader: SyncReader): StreamInput {
    return new StreamInput(ffi.module_(INTERNAL_TOKEN).RnpStreamInputHandle.create(reader));
  }
}

/**
 * Memory-backed Output backed by a sync writer callback.
 *
 * @example
 * ```ts
 * const chunks: Uint8Array[] = [];
 * const output = StreamOutput.create(ffi, (chunk) => {
 *   chunks.push(chunk.slice());  // copy; chunk is a transient view
 *   return true;
 * });
 * ```
 */
export class StreamOutput extends Handle<RnpStreamOutputHandle> {
  private constructor(handle: RnpStreamOutputHandle) { super(handle); }

  static create(ffi: Ffi, writer: SyncWriter): StreamOutput {
    return new StreamOutput(ffi.module_(INTERNAL_TOKEN).RnpStreamOutputHandle.create(writer));
  }

  /** Finalize the output (flush + close). Required after the last write. */
  finish(): void { this.raw.finish(); }
}
