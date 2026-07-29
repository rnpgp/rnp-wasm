// src/cpp/trampoline.cpp
// Definitions for the rnp C callback trampolines declared in trampoline.h.
//
// Single TU to avoid ODR conflicts that arise from `inline extern "C"`.

#include "trampoline.h"

extern "C" {

// rnp_password_cb signature:
//   bool(rnp_ffi_t ffi, void* app_ctx, rnp_key_handle_t key,
//        const char* pgp_context, char* buf, size_t buf_len)
bool rnpwasm_password_trampoline(rnp_ffi_t        ffi,
                                void*            /*app_ctx*/,
                                rnp_key_handle_t key,
                                const char*      pgp_context,
                                char*            buf,
                                size_t           buf_len) {
  const auto ffi_id = reinterpret_cast<uintptr_t>(ffi);
  std::string pw;
  const std::string fprint = rnpwasm::key_fingerprint_or_empty(key);
  if (!rnpwasm::ProviderRegistry::instance().call_password(
          ffi_id, fprint, pgp_context ? pgp_context : "", pw)) {
    return false;
  }
  if (pw.size() >= buf_len) return false;
  std::copy(pw.begin(), pw.end(), buf);
  buf[pw.size()] = '\0';
  return true;
}

// rnp_get_key_cb signature:
//   void(rnp_ffi_t ffi, void* app_ctx, const char* identifier_type,
//        const char* identifier, bool secret)
void rnpwasm_key_provider_trampoline(rnp_ffi_t   ffi,
                                     void*       /*app_ctx*/,
                                     const char* identifier_type,
                                     const char* identifier,
                                     bool        secret) {
  const auto ffi_id = reinterpret_cast<uintptr_t>(ffi);
  rnpwasm::ProviderRegistry::instance().call_key_provider(
      ffi_id,
      identifier_type ? identifier_type : "",
      identifier ? identifier : "",
      secret);
}

}  // extern "C"
