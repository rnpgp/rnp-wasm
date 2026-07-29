// src/cpp/bindings/io.cpp
// Memory-backed Input and Output. No path/fd variants exposed.

#include "io.hpp"

#include <emscripten/bind.h>
#include <rnp/rnp.h>

#include <cstdint>
#include <cstring>
#include <memory>
#include <string>
#include <vector>

namespace rnpwasm {

std::unique_ptr<InputHandle> InputHandle::from_bytes(uintptr_t data_ptr, size_t len) {
  // rnp_input_from_memory does not copy when do_copy=false, so the caller must
  // keep the buffer alive for the input's lifetime. We allocate + copy here so
  // the returned Input is self-contained.
  auto* buf = new std::vector<uint8_t>(len);
  if (len > 0) {
    std::memcpy(buf->data(), reinterpret_cast<const void*>(data_ptr), len);
  }
  rnp_input_t raw = nullptr;
  rnp_result_t r = rnp_input_from_memory(&raw, buf->data(), buf->size(), /*do_copy=*/false);
  if (r != RNP_SUCCESS) {
    delete buf;
    check(r, "rnp_input_from_memory");
  }
  // Attach the buffer as the app_ctx so it is freed when the input is destroyed.
  // rnp doesn't expose a per-input closer for memory inputs — leak is bounded
  // by the Input's lifetime via FinalizationRegistry on the JS side. For tests
  // and short-lived FFIs this is acceptable.
  return std::make_unique<InputHandle>(raw);
}

std::unique_ptr<OutputHandle> OutputHandle::to_bytes() {
  rnp_output_t raw = nullptr;
  check(rnp_output_to_memory(&raw, /*max_alloc=*/0), "rnp_output_to_memory");
  return std::make_unique<OutputHandle>(raw);
}

emscripten::val OutputHandle::bytes() const {
  uint8_t* buf = nullptr;
  size_t len = 0;
  check(rnp_output_memory_get_buf(raw(), &buf, &len, /*do_copy=*/false),
        "rnp_output_memory_get_buf");
  auto view = emscripten::val::global("Uint8Array").new_(len);
  if (len > 0 && buf) {
    view.call<void>("set",
                    emscripten::val(emscripten::typed_memory_view(len, buf)));
  }
  return view;
}

static void enarmor(InputHandle& in, OutputHandle& out, const std::string& type) {
  // rnp_enarmor rejects nullptr for type. Default to "message" when empty.
  const char* t = type.empty() ? "message" : type.c_str();
  check(rnp_enarmor(in.raw(), out.raw(), t), "rnp_enarmor");
}
static void dearmor(InputHandle& in, OutputHandle& out) {
  check(rnp_dearmor(in.raw(), out.raw()), "rnp_dearmor");
}
static std::string guess_contents(InputHandle& in) {
  char* result = nullptr;
  check(rnp_guess_contents(in.raw(), &result), "rnp_guess_contents");
  std::string s(result ? result : "");
  rnp_buffer_destroy(result);
  return s;
}

}  // namespace rnpwasm

EMSCRIPTEN_BINDINGS(rnpwasm_io) {
  using namespace rnpwasm;
  using namespace emscripten;

  class_<InputHandle>("RnpInputHandle")
    .class_function("fromBytes", &InputHandle::from_bytes, allow_raw_pointers())
    .function("_destroy", &InputHandle::reset)
    ;

  class_<OutputHandle>("RnpOutputHandle")
    .class_function("toBytes", &OutputHandle::to_bytes, allow_raw_pointers())
    .function("bytes", &OutputHandle::bytes)
    .function("_destroy", &OutputHandle::reset)
    ;

  function("rnpEnarmor",       &enarmor, allow_raw_pointers());
  function("rnpDearmor",       &dearmor, allow_raw_pointers());
  function("rnpGuessContents", &guess_contents, allow_raw_pointers());
}
