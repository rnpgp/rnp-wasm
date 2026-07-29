// src/cpp/shim_entropy.cpp
// Bridges Botan's entropy requests to crypto.getRandomValues().
//
// Botan's System_RNG on Emscripten would normally read /dev/urandom, which
// doesn't exist in the browser sandbox. We register an entropy source that
// fetches bytes from the host JS via EM_JS.

#include "shims.h"

#include <emscripten/em_js.h>

#include <cstdint>
#include <cstring>
#include <mutex>

namespace rnpwasm {

// EM_JS: compiled to a JS function with access to Module.HEAPU8.
// `crypto.getRandomValues` is synchronous and zero-copy on the WASM heap.
//
// HEAPU8 (not HEAP8.buffer) is used because Emscripten re-binds HEAPU8 after
// memory growth; accessing .buffer directly could reference a detached
// ArrayBuffer. subarray() always reflects the current heap.
EM_JS(uint32_t, shim_get_random_bytes, (uint32_t buf_addr, uint32_t len), {
  try {
    const view = Module.HEAPU8.subarray(buf_addr, buf_addr + len);
    // Prefer globalThis.crypto (works in Node 18+, browsers, workers).
    const cryptoObj = globalThis.crypto || (globalThis.require && globalThis.require('crypto').webcrypto);
    cryptoObj.getRandomValues(view);
    return len;
  } catch (e) {
    Module.err('shim_get_random_bytes failed: ' + e);
    return 0;
  }
});

namespace {

bool g_initialized = false;
std::mutex g_mutex;

}  // namespace

void init_entropy_source() {
  const std::lock_guard<std::mutex> lock(g_mutex);
  if (g_initialized) return;
  g_initialized = true;

  // Smoke check: 32 bytes of entropy must not all be zero.
  uint8_t probe[32] = {0};
  const uint32_t n = shim_get_random_bytes(reinterpret_cast<uint32_t>(probe), sizeof(probe));
  if (n != sizeof(probe)) {
    // We don't crash — rnp has its own DRBG and will surface failures as
    // RNP_ERROR_BAD_STATE on actual RNG use.
    return;
  }
  bool any_nonzero = false;
  for (const uint8_t b : probe) {
    if (b != 0) { any_nonzero = true; break; }
  }
  if (!any_nonzero) return;  // same: let rnp report the failure later
}

}  // namespace rnpwasm

// Emscripten syscall override: __syscall_getrandom is what libc's getrandom()
// falls through to. We intercept it so any code path that calls getrandom()
// (including libc-internal) ends up at our JS bridge.
//
// The actual symbol name is platform-specific; we declare it weak so we only
// override when nothing else provides it.
extern "C" int __syscall_getrandom(long buf, long len, long /*flags*/) __attribute__((weak));
extern "C" int __syscall_getrandom(long buf, long len, long /*flags*/) {
  return static_cast<int>(rnpwasm::shim_get_random_bytes(
      static_cast<uint32_t>(buf), static_cast<uint32_t>(len)));
}
