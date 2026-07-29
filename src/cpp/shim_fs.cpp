// src/cpp/shim_fs.cpp
// Stub for any path-based I/O rnp might try to use.
//
// Our build disables Emscripten's FILESYSTEM (-sFILESYSTEM=0). rnp functions
// taking a file path (rnp_input_from_path, rnp_output_to_path) will fail at
// runtime with RNP_ERROR_READ_OUT_OF_BOUNDS / similar. That's intentional —
// we never want the JS layer to depend on a working filesystem in browsers.

#include "shims.h"

namespace rnpwasm {

void warn_fs_unavailable() {
  // Throwing is risky from arbitrary call sites; log only.
  // Real failure surfaces through rnp's normal error return codes.
#ifdef DEBUG
  extern void emscripten_log(int flags, const char* fmt, ...);
  emscripten_log(0, "rnp-wasm: path-based I/O is disabled; use memory-backed APIs.");
#endif
}

}  // namespace rnpwasm
