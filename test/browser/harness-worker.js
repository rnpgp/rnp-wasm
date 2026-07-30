// test/browser/harness-worker.js
// Worker entry for the browser smoke test. Loaded as a real module worker
// (not a Blob URL) so relative imports resolve correctly against this file's
// URL. import.meta.url is http://127.0.0.1:4173/test/browser/harness-worker.js,
// so "../dist/module.js" → http://127.0.0.1:4173/dist/module.js. ✓

import { initRnp } from "/dist/index.js";

const rnp = await initRnp({ locateWasm: (p) => "/dist/" + p });
const ffi = rnp.createFfi();
const v = rnp.versionString();
ffi.destroy();
postMessage({ ok: true, version: v });
