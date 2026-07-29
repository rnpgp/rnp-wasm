// src/cpp/trampoline.h
// Stable C function-pointer trampolines for rnp's C callbacks.
//
// rnp expects C function pointers for password_cb and get_key_cb. Embind
// exposes JS functions to C++ via emscripten::val, but val cannot be turned
// into a function pointer. We bridge with trampolines that forward to a
// per-FFI std::function slot.
//
// Trampoline signatures MUST match rnp's typedefs exactly:
//   rnp_password_cb : bool(rnp_ffi_t, void*, rnp_key_handle_t, const char*, char*, size_t)
//   rnp_get_key_cb  : void(rnp_ffi_t, void*, const char*, const char*, bool)
//
// Definitions live in trampoline.cpp (single TU) to avoid ODR issues with
// `inline extern "C"` which is implementation-defined.
//
// Asyncify (TODO 37) will let the trampoline await JS promises. For v1
// providers must be synchronous.

#pragma once

#include <functional>
#include <mutex>
#include <string>
#include <unordered_map>

#include <rnp/rnp.h>
#include <rnp/rnp_err.h>

namespace rnpwasm {

// Password callback signature. Returns the password, or empty for "no password".
// - key_fingerprint: fingerprint of the key being unlocked (empty if N/A).
// - pgp_context: rnp's context string ("sign", "decrypt", etc.).
using PasswordFn = std::function<std::string(
    const std::string& key_fingerprint,
    const std::string& pgp_context)>;

// Key provider callback. v1: not wired through to JS (see TODO 22).
using KeyProviderFn = std::function<void(
    const std::string& identifier_type,
    const std::string& identifier,
    bool secret)>;

// Registry of per-FFI callbacks. Key is the rnp_ffi_t cast to uintptr_t.
class ProviderRegistry {
 public:
  static ProviderRegistry& instance() {
    static ProviderRegistry r;
    return r;
  }

  void set_password(uintptr_t ffi_id, PasswordFn fn) {
    const std::lock_guard<std::mutex> lock(mtx_);
    password_[ffi_id] = std::move(fn);
  }
  void set_key_provider(uintptr_t ffi_id, KeyProviderFn fn) {
    const std::lock_guard<std::mutex> lock(mtx_);
    key_provider_[ffi_id] = std::move(fn);
  }
  void drop(uintptr_t ffi_id) {
    const std::lock_guard<std::mutex> lock(mtx_);
    password_.erase(ffi_id);
    key_provider_.erase(ffi_id);
  }

  bool call_password(uintptr_t ffi_id,
                     const std::string& key_fprint,
                     const std::string& pgp_context,
                     std::string& out) {
    PasswordFn fn;
    { const std::lock_guard<std::mutex> lock(mtx_);
      auto it = password_.find(ffi_id);
      if (it == password_.end()) return false;
      fn = it->second;
    }
    out = fn(key_fprint, pgp_context);
    return true;
  }

  void call_key_provider(uintptr_t ffi_id,
                         const std::string& kind,
                         const std::string& id,
                         bool secret) {
    KeyProviderFn fn;
    { const std::lock_guard<std::mutex> lock(mtx_);
      auto it = key_provider_.find(ffi_id);
      if (it == key_provider_.end()) return;
      fn = it->second;
    }
    if (fn) fn(kind, id, secret);
  }

 private:
  std::mutex mtx_;
  std::unordered_map<uintptr_t, PasswordFn> password_;
  std::unordered_map<uintptr_t, KeyProviderFn> key_provider_;
};

// Helper: extract a key's fingerprint safely (returns "" on null).
inline std::string key_fingerprint_or_empty(rnp_key_handle_t key) {
  if (!key) return "";
  char* buf = nullptr;
  if (rnp_key_get_fprint(key, &buf) != RNP_SUCCESS) return "";
  std::string s(buf ? buf : "");
  rnp_buffer_destroy(buf);
  return s;
}

}  // namespace rnpwasm

// ---- C trampoline declarations (defined in trampoline.cpp) ----
extern "C" {
bool rnpwasm_password_trampoline(rnp_ffi_t        ffi,
                                void*            app_ctx,
                                rnp_key_handle_t key,
                                const char*      pgp_context,
                                char*            buf,
                                size_t           buf_len);

void rnpwasm_key_provider_trampoline(rnp_ffi_t   ffi,
                                     void*       app_ctx,
                                     const char* identifier_type,
                                     const char* identifier,
                                     bool        secret);
}
