// src/cpp/bindings/verify.cpp
// Verify operation bindings.
//
// rnp 0.18.1 has no rnp_op_verify_signature_destroy. Per-signature sub-handles
// are owned by the parent op; we wrap them in a plain class.
//
// The verified-signature API surface is:
//   rnp_op_verify_signature_get_status(sig) -> rnp_result_t (direct return)
//   rnp_op_verify_signature_get_hash(sig, &hash)
//   rnp_op_verify_signature_get_key(sig, &key)
//   rnp_op_verify_signature_get_times(sig, &create, &expires)
//   rnp_op_verify_signature_get_handle(sig, &handle)

#include "../error.h"
#include "../handle.h"
#include "ffi.hpp"
#include "io.hpp"

#include <emscripten/bind.h>
#include <rnp/rnp.h>

#include <memory>
#include <string>

namespace rnpwasm {

class VerifySigHandle {
 public:
  explicit VerifySigHandle(rnp_op_verify_signature_t h) : h_(h) {}
  rnp_op_verify_signature_t get() const { return h_; }

  // Direct-return: RNP_SUCCESS means verified.
  uint32_t status() const {
    return static_cast<uint32_t>(rnp_op_verify_signature_get_status(h_));
  }
  std::string hashAlg() const {
    char* p = nullptr;
    check(rnp_op_verify_signature_get_hash(h_, &p), "get_hash");
    std::string s(p ? p : ""); rnp_buffer_destroy(p); return s;
  }
  // No get_sig_alg on the verify-sig handle. Obtain via get_handle + get_alg.
  std::string sigAlg() const {
    rnp_signature_handle_t h = nullptr;
    if (rnp_op_verify_signature_get_handle(h_, &h) != RNP_SUCCESS || !h) return "";
    char* p = nullptr;
    if (rnp_signature_get_alg(h, &p) != RNP_SUCCESS) {
      rnp_signature_handle_destroy(h);
      return "";
    }
    std::string s(p ? p : "");
    rnp_buffer_destroy(p);
    rnp_signature_handle_destroy(h);
    return s;
  }
  std::string signerKeyid() const {
    rnp_key_handle_t k = nullptr;
    if (rnp_op_verify_signature_get_key(h_, &k) != RNP_SUCCESS || !k) return "";
    char* id = nullptr;
    if (rnp_key_get_keyid(k, &id) != RNP_SUCCESS) {
      rnp_key_handle_destroy(k);
      return "";
    }
    std::string s(id ? id : "");
    rnp_buffer_destroy(id);
    rnp_key_handle_destroy(k);
    return s;
  }
  uint32_t creation() const {
    uint32_t create = 0, expires = 0;
    check(rnp_op_verify_signature_get_times(h_, &create, &expires), "get_times");
    return create;
  }
  uint32_t expiration() const {
    uint32_t create = 0, expires = 0;
    check(rnp_op_verify_signature_get_times(h_, &create, &expires), "get_times");
    return expires;
  }

 private:
  rnp_op_verify_signature_t h_;
};

class VerifyOpHandle : public Handle<rnp_op_verify_t, rnp_op_verify_destroy> {
 public:
  explicit VerifyOpHandle(rnp_op_verify_t h) : Handle(h) {}

  size_t signatureCount() const {
    size_t v = 0; check(rnp_op_verify_get_signature_count(get(), &v), "get_signature_count"); return v;
  }
  std::unique_ptr<VerifySigHandle> signatureAt(size_t idx) {
    rnp_op_verify_signature_t s = nullptr;
    check(rnp_op_verify_get_signature_at(get(), idx, &s), "get_signature_at");
    return std::make_unique<VerifySigHandle>(s);
  }
  void execute() {
    RNPWASM_CATCH(do_execute());
  }
  void do_execute() {
    rnp_result_t rc = rnp_op_verify_execute(get());
    // rnp_op_verify_execute returns RNP_ERROR_SIGNATURE_INVALID /
    // RNP_ERROR_SIGNATURE_UNKNOWN / RNP_ERROR_VERIFICATION_FAILED when at
    // least one signature is bad. These are not transport errors — they mean
    // "verification ran, here's the outcome." Per-sig status is exposed via
    // signatureAt(). Don't throw; let the caller inspect the result.
    if (rc != RNP_SUCCESS &&
        rc != RNP_ERROR_SIGNATURE_INVALID &&
        rc != RNP_ERROR_SIGNATURE_UNKNOWN &&
        rc != RNP_ERROR_SIGNATURE_EXPIRED &&
        rc != RNP_ERROR_VERIFICATION_FAILED) {
      check(rc, "rnp_op_verify_execute");
    }
  }
};

static std::unique_ptr<VerifyOpHandle> op_verify_create(FfiHandle& ffi, InputHandle& input, OutputHandle& output) {
  rnp_op_verify_t op = nullptr;
  check(rnp_op_verify_create(&op, ffi.raw(), input.raw(), output.raw()), "rnp_op_verify_create");
  return std::make_unique<VerifyOpHandle>(op);
}

static std::unique_ptr<VerifyOpHandle> op_verify_detached_create(FfiHandle& ffi,
                                                                 InputHandle& input,
                                                                 InputHandle& signature) {
  rnp_op_verify_t op = nullptr;
  check(rnp_op_verify_detached_create(&op, ffi.raw(), input.raw(), signature.raw()),
        "rnp_op_verify_detached_create");
  return std::make_unique<VerifyOpHandle>(op);
}

}  // namespace rnpwasm

EMSCRIPTEN_BINDINGS(rnpwasm_verify) {
  using namespace rnpwasm;
  using namespace emscripten;

  class_<VerifyOpHandle>("RnpVerifyOpHandle")
    .function("_destroy", &VerifyOpHandle::reset)
    .function("signatureCount", &VerifyOpHandle::signatureCount)
    .function("signatureAt",    &VerifyOpHandle::signatureAt, allow_raw_pointers())
    .function("execute",        &VerifyOpHandle::execute)
    ;

  class_<VerifySigHandle>("RnpVerifySigHandle")
    .function("status",     &VerifySigHandle::status)
    .function("hashAlg",    &VerifySigHandle::hashAlg)
    .function("sigAlg",     &VerifySigHandle::sigAlg)
    .function("signerKeyid",&VerifySigHandle::signerKeyid)
    .function("creation",   &VerifySigHandle::creation)
    .function("expiration", &VerifySigHandle::expiration)
    ;

  function("rnpOpVerifyCreate",          &op_verify_create,          allow_raw_pointers());
  function("rnpOpVerifyDetachedCreate",  &op_verify_detached_create, allow_raw_pointers());
}
