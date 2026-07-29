// src/cpp/bindings/decrypt.cpp
// Decrypt bindings.
//
// rnp 0.18.1 has NO `rnp_op_decrypt_*` family. The only decrypt API is the
// high-level one-shot `rnp_decrypt(ffi, input, output)` which writes plaintext
// to the output. For decryption metadata (recipients, AEAD params, etc.) run
// the verify op first — VerifyOperation handles both signed + encrypted.
//
// This binding exposes the one-shot. DecryptOperation in TS wraps it.

#include "../error.h"
#include "ffi.hpp"
#include "io.hpp"

#include <emscripten/bind.h>
#include <rnp/rnp.h>

namespace rnpwasm {

static void rnpwasm_decrypt(FfiHandle& ffi, InputHandle& in, OutputHandle& out) {
  RNPWASM_CATCH(check(rnp_decrypt(ffi.raw(), in.raw(), out.raw()), "rnp_decrypt"));
}

}  // namespace rnpwasm

EMSCRIPTEN_BINDINGS(rnpwasm_decrypt) {
  using namespace rnpwasm;
  using namespace emscripten;

  function("rnpDecrypt", &rnpwasm_decrypt, allow_raw_pointers());
}
