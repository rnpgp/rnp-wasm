// src/cpp/bindings/stream.cpp
// Streaming Input/Output via rnp_input_from_callback / rnp_output_to_callback.
//
// Sync callbacks only in v1. Async streams (WHATWG ReadableStream) require
// Asyncify (TODO 37) to suspend the C call stack while waiting for the next
// JS chunk to arrive.

#include "../error.h"
#include "../handle.h"
#include "io.hpp"

#include <emscripten/bind.h>
#include <rnp/rnp.h>

#include <memory>
#include <mutex>
#include <string>
#include <unordered_map>

namespace rnpwasm {

// JS callbacks are wrapped in std::function to be callable from C++.
// Sync contract: reader returns Uint8Array (view into WASM heap) or null on EOF.
using SyncReader = std::function<bool(uint8_t* buf, size_t len, size_t& read)>;
using SyncWriter = std::function<bool(const uint8_t* buf, size_t len)>;

// Per-instance trampoline context. Holds the JS callback via Embind val.
// Allocated on heap; pointer is passed as app_ctx to rnp's reader/writer.
struct StreamCtx {
  emscripten::val jsCb;
  explicit StreamCtx(emscripten::val cb) : jsCb(std::move(cb)) {}
  virtual ~StreamCtx() = default;
};

struct ReaderCtx : StreamCtx {
  using StreamCtx::StreamCtx;
};
struct WriterCtx : StreamCtx {
  using StreamCtx::StreamCtx;
  bool discard = false;
};

// C trampolines — signatures match rnp_input_reader_t / rnp_output_writer_t.
extern "C" {

static bool rnpwasm_reader_trampoline(void* app_ctx, void* buf, size_t len, size_t* read) {
  auto* ctx = static_cast<ReaderCtx*>(app_ctx);
  try {
    emscripten::val rv = ctx->jsCb(emscripten::typed_memory_view(len, static_cast<uint8_t*>(buf)));
    if (rv.isNumber()) {
      const uint32_t n = rv.as<uint32_t>();
      *read = n;
      return n <= len;
    }
    if (rv.isNull() || rv.isUndefined()) {
      *read = 0;  // EOF
      return true;
    }
    return false;
  } catch (...) {
    return false;
  }
}

static void rnpwasm_reader_closer(void* app_ctx) {
  delete static_cast<ReaderCtx*>(app_ctx);
}

static bool rnpwasm_writer_trampoline(void* app_ctx, const void* buf, size_t len) {
  auto* ctx = static_cast<WriterCtx*>(app_ctx);
  try {
    emscripten::val rv = ctx->jsCb(emscripten::typed_memory_view(len, static_cast<const uint8_t*>(buf)));
    return rv.isUndefined() || rv.isNull() || rv.as<bool>();
  } catch (...) {
    return false;
  }
}

static void rnpwasm_writer_closer(void* app_ctx, bool discard) {
  auto* ctx = static_cast<WriterCtx*>(app_ctx);
  ctx->discard = discard;
  delete ctx;
}

}  // extern "C"

// Input backed by a JS sync reader. reader(buf: Uint8Array view) → number of
// bytes written (0 < n <= buf.length) or null for EOF.
//
// Inherits InputHandle so Embind's base<InputHandle> is satisfied and JS
// callers can pass a StreamInput anywhere an Input is required.
class StreamInputHandle : public InputHandle {
 public:
  explicit StreamInputHandle(rnp_input_t h) : InputHandle(h) {}

  static std::unique_ptr<StreamInputHandle> create(emscripten::val reader) {
    auto* ctx = new ReaderCtx(std::move(reader));
    rnp_input_t in = nullptr;
    rnp_result_t r = rnp_input_from_callback(&in,
                                             rnpwasm_reader_trampoline,
                                             rnpwasm_reader_closer,
                                             ctx);
    if (r != RNP_SUCCESS) {
      delete ctx;
      check(r, "rnp_input_from_callback");
    }
    return std::make_unique<StreamInputHandle>(in);
  }
};

// Output backed by a JS sync writer. writer(chunk: Uint8Array view) → boolean.
//
// Inherits OutputHandle for the same reason as above.
class StreamOutputHandle : public OutputHandle {
 public:
  explicit StreamOutputHandle(rnp_output_t h) : OutputHandle(h) {}

  static std::unique_ptr<StreamOutputHandle> create(emscripten::val writer) {
    auto* ctx = new WriterCtx(std::move(writer));
    rnp_output_t out = nullptr;
    rnp_result_t r = rnp_output_to_callback(&out,
                                            rnpwasm_writer_trampoline,
                                            rnpwasm_writer_closer,
                                            ctx);
    if (r != RNP_SUCCESS) {
      delete ctx;
      check(r, "rnp_output_to_callback");
    }
    return std::make_unique<StreamOutputHandle>(out);
  }

  void finish() { check(rnp_output_finish(get()), "rnp_output_finish"); }
};

}  // namespace rnpwasm

EMSCRIPTEN_BINDINGS(rnpwasm_stream) {
  using namespace rnpwasm;
  using namespace emscripten;

  class_<StreamInputHandle, base<InputHandle>>("RnpStreamInput")
    .class_function("create", &StreamInputHandle::create, allow_raw_pointers())
    .function("_destroy", &StreamInputHandle::reset)
    ;

  class_<StreamOutputHandle, base<OutputHandle>>("RnpStreamOutput")
    .class_function("create", &StreamOutputHandle::create, allow_raw_pointers())
    .function("finish", &StreamOutputHandle::finish)
    .function("_destroy", &StreamOutputHandle::reset)
    ;
}
