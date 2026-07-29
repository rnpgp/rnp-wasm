// src/cpp/bindings/ffi.cpp
// FfiHandle method implementations + Embind registration.

#include "ffi.hpp"

#include <emscripten/bind.h>
#include <rnp/rnp.h>
#include <rnp/rnp_err.h>

#include <cstdint>
#include <memory>
#include <string>

namespace rnpwasm {

std::unique_ptr<FfiHandle> FfiHandle::create(const std::string& pub_format,
                                             const std::string& sec_format) {
  rnp_ffi_t ffi = nullptr;
  check(rnp_ffi_create(&ffi, pub_format.c_str(), sec_format.c_str()), "rnp_ffi_create");
  return std::make_unique<FfiHandle>(ffi);
}

void FfiHandle::set_password_provider(emscripten::val callback) {
  PasswordFn fn = [cb = std::move(callback)](
      const std::string& key_fprint,
      const std::string& pgp_context) -> std::string {
    emscripten::val rv = cb(key_fprint, pgp_context);
    if (rv.isUndefined() || rv.isNull()) return "";
    return rv.as<std::string>();
  };
  ProviderRegistry::instance().set_password(
      reinterpret_cast<uintptr_t>(ffi_), std::move(fn));
  check(rnp_ffi_set_pass_provider(ffi_, rnpwasm_password_trampoline, ffi_),
        "rnp_ffi_set_pass_provider");
}

void FfiHandle::set_key_provider(emscripten::val callback) {
  (void)callback;
  KeyProviderFn noop;
  ProviderRegistry::instance().set_key_provider(
      reinterpret_cast<uintptr_t>(ffi_), std::move(noop));
  check(rnp_ffi_set_key_provider(ffi_, rnpwasm_key_provider_trampoline, ffi_),
        "rnp_ffi_set_key_provider");
}

// ---- Free functions ----

static std::string version_string() { return rnp_version_string(); }
static std::string version_string_full() { return rnp_version_string_full(); }
static uint32_t version_value() { return rnp_version(); }
static uint64_t version_commit_timestamp() { return rnp_version_commit_timestamp(); }

// Translate caller-friendly slug ("symmetric", "hash", ...) to rnp's
// RNP_FEATURE_* string constant. rnp_supported_features returns
// RNP_ERROR_BAD_PARAMETERS for anything else.
static const char* feature_slug_to_rnp_type(const std::string& slug) {
  if (slug == "symmetric")                return RNP_FEATURE_SYMM_ALG;
  if (slug == "aead")                     return RNP_FEATURE_AEAD_ALG;
  if (slug == "hash")                     return RNP_FEATURE_HASH_ALG;
  if (slug == "compression")              return RNP_FEATURE_COMP_ALG;
  if (slug == "asymmetric" || slug == "pk") return RNP_FEATURE_PK_ALG;
  if (slug == "curve")                    return RNP_FEATURE_CURVE;
  return nullptr;
}

static bool supports_feature(const std::string& type, const std::string& name) {
  const char* rnp_type = feature_slug_to_rnp_type(type);
  if (!rnp_type) {
    emscripten::val::global("Error").new_(std::string("unknown feature type: ") + type).throw_();
  }
  bool out = false;
  check(rnp_supports_feature(rnp_type, name.c_str(), &out), "rnp_supports_feature");
  return out;
}

static std::string supported_features(const std::string& type) {
  const char* rnp_type = feature_slug_to_rnp_type(type);
  if (!rnp_type) {
    emscripten::val::global("Error").new_(std::string("unknown feature type: ") + type).throw_();
  }
  char* result = nullptr;
  check(rnp_supported_features(rnp_type, &result), "rnp_supported_features");
  std::string s(result ? result : "");
  rnp_buffer_destroy(result);
  return s;
}

static uint32_t calculate_iterations(const std::string& hash, uint64_t msec) {
  size_t iters = 0;
  check(rnp_calculate_iterations(hash.c_str(), msec, &iters), "rnp_calculate_iterations");
  if (iters > UINT32_MAX) return UINT32_MAX;
  return static_cast<uint32_t>(iters);
}

}  // namespace rnpwasm

EMSCRIPTEN_BINDINGS(rnpwasm_ffi) {
  using namespace rnpwasm;
  using namespace emscripten;

  class_<FfiHandle>("RnpFfiHandle")
    .class_function("create", &FfiHandle::create, allow_raw_pointers())
    .function("setPasswordProvider", &FfiHandle::set_password_provider)
    .function("setKeyProvider",     &FfiHandle::set_key_provider)
    .function("setTimestamp",       &FfiHandle::set_timestamp)
    .function("_id",                &FfiHandle::id)
    .function("_destroy",           &FfiHandle::reset)
    ;

  function("rnpVersionString",           &version_string);
  function("rnpVersionStringFull",       &version_string_full);
  function("rnpVersion",                 &version_value);
  function("rnpVersionCommitTimestamp",  &version_commit_timestamp);
  function("rnpSupportsFeature",         &supports_feature);
  function("rnpSupportedFeatures",       &supported_features);
  function("rnpCalculateIterations",     &calculate_iterations);
}
