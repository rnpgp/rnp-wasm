// src/cpp/error.h
// Error handling for rnp-wasm. Uses emscripten::val to throw JS Error objects
// directly from check(), and additionally wraps binding entry points with
// try/catch via CHECK_TRY() so that any C++ exception escaping rnp's FFI_GUARD
// (e.g. rnp::rnp_exception from a Botan error path) is converted into a JS
// Error carrying the .what() message. Without this Embind surfaces a bare
// CppException with no message, which is unactionable from JS.

#pragma once

#include <string>

#include <emscripten/val.h>
#include <rnp/rnp.h>
#include <rnp/rnp_err.h>

namespace rnpwasm {

// Check rnp result and throw JS Error on failure. No C++ exceptions escape.
inline void check(rnp_result_t result, const char* ctx = nullptr) {
  if (result != RNP_SUCCESS) {
    std::string msg = (ctx ? std::string(ctx) + ": " : std::string(""))
                      + rnp_result_to_string(result);
    emscripten::val::global("Error").new_(msg).throw_();
  }
}

// Wrap a rnp FFI call expression and convert any escaping C++ exception to a
// JS Error. Use around entry points where rnp itself may throw past FFI_GUARD
// (e.g. when EH is enabled, rnp exception paths in deep template code).
inline void rnpwasm_rethrow_cpp_exception() {
  try {
    throw;
  } catch (const std::exception& e) {
    emscripten::val::global("Error").new_(std::string(e.what())).throw_();
  } catch (...) {
    emscripten::val::global("Error").new_(std::string("unknown C++ exception")).throw_();
  }
}

#define RNPWASM_CATCH(expr)                                            \
  do {                                                                 \
    try { expr; }                                                      \
    catch (...) { rnpwasm::rnpwasm_rethrow_cpp_exception(); }          \
  } while (0)

}  // namespace rnpwasm

