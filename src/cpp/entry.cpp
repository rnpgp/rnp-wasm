// src/cpp/entry.cpp
// Aggregator. Every EMSCRIPTEN_BINDINGS(name) block in the bindings/*.cpp
// files is auto-registered at module load by Embind; this file just ensures
// the entropy shim runs first.

#include "shims.h"

#include <emscripten/bind.h>

EMSCRIPTEN_BINDINGS(rnpwasm_entry) {
  rnpwasm::init_entropy_source();
  // Other bindings are registered by their own EMSCRIPTEN_BINDINGS blocks.
}

