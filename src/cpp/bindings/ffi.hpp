// src/cpp/bindings/ffi.hpp
// FfiHandle definition shared across binding TUs.

#pragma once

#include "../error.h"
#include "../trampoline.h"

#include <emscripten/val.h>
#include <rnp/rnp.h>

#include <cstdint>
#include <memory>
#include <string>

namespace rnpwasm {

class FfiHandle {
 public:
  FfiHandle() = default;
  explicit FfiHandle(rnp_ffi_t ffi) : ffi_(ffi) {}
  ~FfiHandle() { reset(); }

  FfiHandle(const FfiHandle&) = delete;
  FfiHandle& operator=(const FfiHandle&) = delete;
  FfiHandle(FfiHandle&& o) noexcept : ffi_(o.ffi_) { o.ffi_ = nullptr; }
  FfiHandle& operator=(FfiHandle&& o) noexcept {
    if (this != &o) { reset(); ffi_ = o.ffi_; o.ffi_ = nullptr; }
    return *this;
  }

  void reset() {
    if (ffi_) {
      ProviderRegistry::instance().drop(reinterpret_cast<uintptr_t>(ffi_));
      rnp_ffi_destroy(ffi_);
      ffi_ = nullptr;
    }
  }

  static std::unique_ptr<FfiHandle> create(const std::string& pub_format,
                                           const std::string& sec_format);

  void set_password_provider(emscripten::val callback);
  void set_key_provider(emscripten::val callback);
  void set_timestamp(uint64_t t) {
    check(rnp_set_timestamp(ffi_, t), "rnp_set_timestamp");
  }

  rnp_ffi_t raw() const { return ffi_; }
  uintptr_t id() const { return reinterpret_cast<uintptr_t>(ffi_); }

 private:
  rnp_ffi_t ffi_ = nullptr;
};

}  // namespace rnpwasm
