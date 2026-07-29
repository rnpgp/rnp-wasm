// src/cpp/bindings/dump.cpp
// Packet dump bindings.

#include "../error.h"
#include "ffi.hpp"
#include "io.hpp"

#include <emscripten/bind.h>
#include <rnp/rnp.h>

#include <string>

namespace rnpwasm {

static std::string dump_packets_to_json(InputHandle& in, uint32_t flags) {
  char* json = nullptr;
  check(rnp_dump_packets_to_json(in.raw(), flags, &json), "rnp_dump_packets_to_json");
  std::string s(json ? json : ""); rnp_buffer_destroy(json); return s;
}

static void dump_packets_to_output(InputHandle& in, OutputHandle& out, uint32_t flags) {
  check(rnp_dump_packets_to_output(in.raw(), out.raw(), flags), "rnp_dump_packets_to_output");
}

}  // namespace rnpwasm

EMSCRIPTEN_BINDINGS(rnpwasm_dump) {
  using namespace rnpwasm;
  using namespace emscripten;

  function("rnpDumpPacketsToJson",   &dump_packets_to_json,   allow_raw_pointers());
  function("rnpDumpPacketsToOutput", &dump_packets_to_output, allow_raw_pointers());
}
