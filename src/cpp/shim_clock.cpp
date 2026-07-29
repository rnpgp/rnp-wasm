// src/cpp/shim_clock.cpp
// Wall clock bridge for rnp/Botan.
//
// Emscripten's libc already provides time() and clock_gettime(CLOCK_REALTIME)
// via JS Date.now(). This shim exists only to:
//  - Pin a deterministic clock for test mode (RNPWASM_CLOCK_SEED env var).
//  - Provide a monotonic clock source for diagnostic timing.

#include "shims.h"

#include <emscripten/em_js.h>

#include <chrono>

namespace rnpwasm {

uint64_t monotonic_millis() {
  // steady_clock is monotonic; not affected by wall clock changes.
  const auto t = std::chrono::steady_clock::now();
  return static_cast<uint64_t>(
      std::chrono::duration_cast<std::chrono::milliseconds>(
          t.time_since_epoch()).count());
}

}  // namespace rnpwasm
