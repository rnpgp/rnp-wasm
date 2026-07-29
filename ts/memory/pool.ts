/**
 * ts/memory/pool.ts
 * Per-module byte buffer pool for JS↔WASM heap transfers.
 *
 * Without a pool, every Input.fromBytes() does _malloc + _free, and every
 * Output.bytes() does a Uint8Array allocation. For streaming workloads these
 * add up. The pool hands out previously-allocated slots and recycles them.
 *
 * Default behavior:
 *   - Buckets are power-of-two sized (256B, 1KB, 4KB, 16KB, 64KB, 256KB, 1MB).
 *   - Each bucket holds up to 4 buffers.
 *   - Maximum resident memory per pool: ~16MB by default.
 */

export interface BufferPoolStats {
  readonly hits: number;
  readonly misses: number;
  readonly resident: number;  // bytes
  readonly evictions: number;
}

interface Slot {
  ptr: number;
  size: number;
}

export class ByteBufferPool {
  private readonly buckets = new Map<number, Slot[]>();  // key = bucket size
  private readonly capPerBucket;
  private hits = 0;
  private misses = 0;
  private evictions = 0;
  private residentBytes = 0;
  private readonly malloc: (n: number) => number;
  private readonly free: (ptr: number) => void;

  /**
   * @param moduleMalloc  Emscripten `_malloc`
   * @param moduleFree    Emscripten `_free`
   */
  constructor(
    moduleMalloc: (n: number) => number,
    moduleFree: (ptr: number) => void,
    opts: { capPerBucket?: number } = {},
  ) {
    this.malloc = moduleMalloc;
    this.free = moduleFree;
    this.capPerBucket = opts.capPerBucket ?? 4;
  }

  /**
   * Acquire a buffer of at least `minSize` bytes. Caller must `release()` it.
   * Returns the WASM-heap pointer (caller manages HEAPU8 view).
   */
  acquire(minSize: number): { ptr: number; size: number } {
    const bucket = roundUp(minSize);
    const list = this.buckets.get(bucket);
    if (list && list.length > 0) {
      const slot = list.pop()!;
      this.hits++;
      return { ptr: slot.ptr, size: slot.size };
    }
    this.misses++;
    const ptr = this.malloc(bucket);
    if (ptr === 0) throw new Error("ByteBufferPool: WASM out of memory");
    this.residentBytes += bucket;
    return { ptr, size: bucket };
  }

  release(buf: { ptr: number; size: number }): void {
    const bucket = roundUp(buf.size);
    let list = this.buckets.get(bucket);
    if (!list) {
      list = [];
      this.buckets.set(bucket, list);
    }
    if (list.length >= this.capPerBucket) {
      // Bucket is full; release to WASM.
      this.free(buf.ptr);
      this.residentBytes -= buf.size;
      this.evictions++;
      return;
    }
    list.push({ ptr: buf.ptr, size: bucket });
  }

  /** Release all pooled buffers. Use on memory pressure or for diagnostics. */
  drain(): void {
    for (const [size, list] of this.buckets) {
      for (const slot of list) {
        this.free(slot.ptr);
        this.residentBytes -= size;
      }
      list.length = 0;
    }
  }

  stats(): BufferPoolStats {
    return {
      hits: this.hits,
      misses: this.misses,
      resident: this.residentBytes,
      evictions: this.evictions,
    };
  }
}

function roundUp(n: number): number {
  if (n <= 256) return 256;
  let p = 256;
  while (p < n) p <<= 1;
  return p;
}
