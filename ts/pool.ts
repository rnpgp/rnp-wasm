/**
 * ts/pool.ts
 * Worker pool for off-main-thread rnp operations.
 *
 * Each worker owns a sticky FFI + Keyring for the lifetime of a session.
 * Round-robin scheduling distributes sessions across workers.
 *
 * Usage:
 *   const pool = new WorkerPool({ size: 4 });
 *   const session = await pool.session();
 *   await session.loadKey(secretBytes);
 *   const { signed } = await session.sign(messageBytes, fingerprint);
 *   await session.terminate();
 */

import * as Comlink from "comlink";
export type { WorkerApi } from "./worker.js";
import type { WorkerApi } from "./worker.js";

export interface WorkerPoolOptions {
  size?: number;
  /** Override the worker script URL (testing, custom bundling). */
  workerUrl?: URL;
}

export class WorkerPool {
  private readonly workers: ReadonlyArray<Comlink.Remote<WorkerApi>>;
  private rr = 0;

  constructor(opts: WorkerPoolOptions = {}) {
    const size = opts.size ?? (typeof navigator !== "undefined" ? navigator.hardwareConcurrency ?? 4 : 4);
    if (size < 1) throw new Error("WorkerPool: size must be >= 1");
    const url = opts.workerUrl ?? new URL("./worker.js", import.meta.url);
    this.workers = Array.from({ length: size }, () => {
      const worker = new Worker(url, { type: "module" });
      return Comlink.wrap<WorkerApi>(worker);
    });
  }

  /**
   * Returns a Comlink-remote WorkerSession. Each call advances round-robin
   * so successive sessions land on different workers.
   */
  session(): Comlink.Remote<WorkerApi> {
    const api = this.workers[this.rr]!;
    this.rr = (this.rr + 1) % this.workers.length;
    return api;
  }

  async terminateAll(): Promise<void> {
    for (const w of this.workers) {
      try { await w.terminate(); } catch { /* swallow */ }
    }
  }
}
