// src/cpp/bindings/keyring.cpp
// Keyring management: load, import, save, locate, counts, unload.

#include "../error.h"
#include "ffi.hpp"
#include "io.hpp"
#include "key.hpp"

#include <emscripten/bind.h>
#include <rnp/rnp.h>

#include <memory>
#include <string>

namespace rnpwasm {

static void load_keys(FfiHandle& ffi, const std::string& format, InputHandle& input, uint32_t flags) {
  check(rnp_load_keys(ffi.raw(), format.c_str(), input.raw(), flags), "rnp_load_keys");
}

static void unload_keys(FfiHandle& ffi, uint32_t flags) {
  check(rnp_unload_keys(ffi.raw(), flags), "rnp_unload_keys");
}

// rnp_import_keys takes a callback for results. We capture as a single JSON
// string by passing nullptr for results_cb — rnp writes the JSON into *results.
static std::string import_keys(FfiHandle& ffi, InputHandle& input, uint32_t flags) {
  char* results = nullptr;
  check(rnp_import_keys(ffi.raw(), input.raw(), flags, results ? &results : &results),
        "rnp_import_keys");
  std::string s(results ? results : "");
  rnp_buffer_destroy(results);
  return s;
}

static std::string import_signatures(FfiHandle& ffi, InputHandle& input, uint32_t flags) {
  char* results = nullptr;
  check(rnp_import_signatures(ffi.raw(), input.raw(), flags, &results),
        "rnp_import_signatures");
  std::string s(results ? results : "");
  rnp_buffer_destroy(results);
  return s;
}

static void save_keys(FfiHandle& ffi, const std::string& format, OutputHandle& output, uint32_t flags) {
  check(rnp_save_keys(ffi.raw(), format.c_str(), output.raw(), flags), "rnp_save_keys");
}

static size_t public_key_count(FfiHandle& ffi) {
  size_t n = 0;
  check(rnp_get_public_key_count(ffi.raw(), &n), "rnp_get_public_key_count");
  return n;
}
static size_t secret_key_count(FfiHandle& ffi) {
  size_t n = 0;
  check(rnp_get_secret_key_count(ffi.raw(), &n), "rnp_get_secret_key_count");
  return n;
}

static std::unique_ptr<KeyHandle> locate_key(FfiHandle& ffi,
                                              const std::string& id_type,
                                              const std::string& id) {
  rnp_key_handle_t key = nullptr;
  check(rnp_locate_key(ffi.raw(), id_type.c_str(), id.c_str(), &key),
        "rnp_locate_key");
  if (!key) return nullptr;
  return std::make_unique<KeyHandle>(key);
}

}  // namespace rnpwasm

EMSCRIPTEN_BINDINGS(rnpwasm_keyring) {
  using namespace rnpwasm;
  using namespace emscripten;

  function("rnpLoadKeys",          &load_keys,          allow_raw_pointers());
  function("rnpUnloadKeys",        &unload_keys,        allow_raw_pointers());
  function("rnpImportKeys",        &import_keys,        allow_raw_pointers());
  function("rnpImportSignatures",  &import_signatures,  allow_raw_pointers());
  function("rnpSaveKeys",          &save_keys,          allow_raw_pointers());
  function("rnpPublicKeyCount",    &public_key_count,   allow_raw_pointers());
  function("rnpSecretKeyCount",    &secret_key_count,   allow_raw_pointers());
  function("rnpLocateKey",         &locate_key,         allow_raw_pointers());
}
