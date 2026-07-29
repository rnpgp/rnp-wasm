/**
 * ts/wasm-module.ts
 * Loads the Emscripten-generated module.
 *
 * The build emits `dist/module.js` as ESM (Emscripten EXPORT_ES6=1). We locate
 * the `.wasm` beside it via the `locateFile` hook.
 */

import type { RnpModule } from "./module-types.js";

export interface InitOptions {
  /**
   * Override the URL used to fetch the .wasm file. By default, the loader
   * resolves `${import.meta.url}` → `./module.wasm`. Override for CDNs,
   * bundlers with custom asset paths, or for embedding the wasm as base64.
   */
  locateWasm?: (path: string) => string;

  /** Pre-instantiated WebAssembly.Memory (rarely needed). */
  memory?: WebAssembly.Memory;
}

/**
 * Dynamically imports the Embind module factory and instantiates it.
 *
 * The factory lives at `../dist/module.js` (ESM via EXPORT_ES6=1). The actual
 * file is Emscripten-generated and untyped; we cast to the expected factory
 * shape.
 */
export async function loadModule(opts: InitOptions = {}): Promise<RnpModule> {
  // The dynamic import path resolves to dist/module.js, which is Emscripten-
  // generated and untyped. Ambient shim in ts/rnp-js-shim.d.ts declares the
  // default export shape via a wildcard module declaration.
  const factory = ((await import("../dist/module.js")).default as (opts: Record<string, unknown>) => Promise<RnpModule>);

  const locateFile = (path: string): string => {
    if (path.endsWith(".wasm") && opts.locateWasm) {
      return opts.locateWasm(path);
    }
    return path;
  };

  return factory({
    locateFile,
    ...(opts.memory ? { INITIAL_MEMORY: opts.memory } : {}),
  });
}
