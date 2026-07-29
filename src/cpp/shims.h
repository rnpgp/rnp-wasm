// src/cpp/shims.h
// Single header aggregating all platform shims used by rnp-wasm.
// Individual shims live in shim_*.cpp.

#pragma once

#include <cstddef>
#include <cstdint>

namespace rnpwasm {

// Initializes the entropy source. Called once at module init.
// Internally bridges Botan's System_RNG to crypto.getRandomValues().
void init_entropy_source();

// Returns monotonic milliseconds since module load. Used by rnp's clock shim
// when real wall clock isn't appropriate (e.g., deterministic test mode).
uint64_t monotonic_millis();

}  // namespace rnpwasm
