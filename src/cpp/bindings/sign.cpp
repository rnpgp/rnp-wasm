// src/cpp/bindings/sign.cpp
// Sign operation bindings. Per-signature sub-handles are configured inline
// (no returned handle) because Embind can't wrap unique_ptr to a class
// without a registered constructor without corrupting the function table.

#include "../error.h"
#include "ffi.hpp"
#include "io.hpp"
#include "key.hpp"

#include <emscripten/bind.h>
#include <rnp/rnp.h>

#include <memory>
#include <string>

namespace rnpwasm {

class SignOpHandle : public Handle<rnp_op_sign_t, rnp_op_sign_destroy> {
 public:
  explicit SignOpHandle(rnp_op_sign_t h) : Handle(h) {}

  // Configures a signature inline: adds it to the op, optionally sets
  // per-sig hash/creation/expiration, then discards the per-sig handle.
  // The per-sig handle's lifetime is bound to the parent op.
  void addSignature(KeyHandle& signer,
                    const std::string& hash,
                    uint32_t creation,
                    uint32_t expiration) {
    rnp_op_sign_signature_t sig = nullptr;
    check(rnp_op_sign_add_signature(get(), signer.get(), &sig), "rnp_op_sign_add_signature");
    if (!hash.empty())     check(rnp_op_sign_signature_set_hash(sig, hash.c_str()), "sig_set_hash");
    if (creation > 0)      check(rnp_op_sign_signature_set_creation_time(sig, creation), "sig_set_creation");
    if (expiration > 0)    check(rnp_op_sign_signature_set_expiration_time(sig, expiration), "sig_set_expiration");
  }
  void setArmor(bool a)               { check(rnp_op_sign_set_armor(get(), a), "set_armor"); }
  void setCompression(const std::string& alg, int level) {
    check(rnp_op_sign_set_compression(get(), alg.c_str(), level), "set_compression");
  }
  void setHash(const std::string& h)  { check(rnp_op_sign_set_hash(get(), h.c_str()), "set_hash"); }
  void setCreationTime(uint64_t t)    { check(rnp_op_sign_set_creation_time(get(), t), "set_creation_time"); }
  void setExpirationTime(uint32_t t)  { check(rnp_op_sign_set_expiration_time(get(), t), "set_expiration_time"); }
  void setFileName(const std::string& n) { check(rnp_op_sign_set_file_name(get(), n.c_str()), "set_file_name"); }
  void setFileMtime(uint64_t t)       { check(rnp_op_sign_set_file_mtime(get(), t), "set_file_mtime"); }
  void execute()                      { RNPWASM_CATCH(check(rnp_op_sign_execute(get()), "rnp_op_sign_execute")); }
};

static std::unique_ptr<SignOpHandle> op_sign_create(FfiHandle& ffi, InputHandle& in, OutputHandle& out) {
  rnp_op_sign_t op = nullptr;
  check(rnp_op_sign_create(&op, ffi.raw(), in.raw(), out.raw()), "rnp_op_sign_create");
  return std::make_unique<SignOpHandle>(op);
}
static std::unique_ptr<SignOpHandle> op_sign_cleartext_create(FfiHandle& ffi, InputHandle& in, OutputHandle& out) {
  rnp_op_sign_t op = nullptr;
  check(rnp_op_sign_cleartext_create(&op, ffi.raw(), in.raw(), out.raw()), "rnp_op_sign_cleartext_create");
  return std::make_unique<SignOpHandle>(op);
}
static std::unique_ptr<SignOpHandle> op_sign_detached_create(FfiHandle& ffi, InputHandle& in, OutputHandle& out) {
  rnp_op_sign_t op = nullptr;
  check(rnp_op_sign_detached_create(&op, ffi.raw(), in.raw(), out.raw()), "rnp_op_sign_detached_create");
  return std::make_unique<SignOpHandle>(op);
}

static void sign_execute(SignOpHandle& op) {
  check(rnp_op_sign_execute(op.get()), "rnp_op_sign_execute");
}

}  // namespace rnpwasm

EMSCRIPTEN_BINDINGS(rnpwasm_sign) {
  using namespace rnpwasm;
  using namespace emscripten;

  class_<SignOpHandle>("RnpSignOpHandle")
    .function("_destroy", &SignOpHandle::reset)
    .function("addSignature", &SignOpHandle::addSignature, allow_raw_pointers())
    .function("setArmor", &SignOpHandle::setArmor)
    .function("setCompression", &SignOpHandle::setCompression)
    .function("setHash", &SignOpHandle::setHash)
    .function("setCreationTime", &SignOpHandle::setCreationTime)
    .function("setExpirationTime", &SignOpHandle::setExpirationTime)
    .function("setFileName", &SignOpHandle::setFileName)
    .function("setFileMtime", &SignOpHandle::setFileMtime)
    .function("execute", &SignOpHandle::execute)
    ;

  function("rnpOpSignCreate", &op_sign_create, allow_raw_pointers());
  function("rnpOpSignCleartextCreate", &op_sign_cleartext_create, allow_raw_pointers());
  function("rnpOpSignDetachedCreate", &op_sign_detached_create, allow_raw_pointers());
  function("rnpSignExecute", &sign_execute, allow_raw_pointers());
}
