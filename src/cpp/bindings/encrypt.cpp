// src/cpp/bindings/encrypt.cpp
// Encrypt operation bindings.

#include "../error.h"
#include "../handle.h"
#include "ffi.hpp"
#include "io.hpp"
#include "key.hpp"

#include <emscripten/bind.h>
#include <rnp/rnp.h>

#include <memory>
#include <string>

namespace rnpwasm {

class EncryptOpHandle : public Handle<rnp_op_encrypt_t, rnp_op_encrypt_destroy> {
 public:
  explicit EncryptOpHandle(rnp_op_encrypt_t h) : Handle(h) {}

  void addRecipient(KeyHandle& key) {
    RNPWASM_CATCH(check(rnp_op_encrypt_add_recipient(get(), key.get()), "add_recipient"));
  }
  // rnp_op_encrypt_add_password signature:
  //   rnp_op_encrypt_t op,
  //   const char* password,
  //   const char* s2k_hash,        // e.g. "SHA256" — pass empty/null for rnp default
  //   size_t iterations,           // 0 = rnp default
  //   const char* s2k_cipher,     // e.g. "AES256"  — pass empty/null for rnp default
  void addPassword(const std::string& pw,
                   const std::string& s2k_hash,
                   size_t iterations,
                   const std::string& s2k_cipher) {
    check(rnp_op_encrypt_add_password(get(),
                                      pw.c_str(),
                                      s2k_hash.empty() ? nullptr : s2k_hash.c_str(),
                                      iterations,
                                      s2k_cipher.empty() ? nullptr : s2k_cipher.c_str()),
          "add_password");
  }
  void setArmor(bool a)             { check(rnp_op_encrypt_set_armor(get(), a), "set_armor"); }
  void setCipher(const std::string& c) { check(rnp_op_encrypt_set_cipher(get(), c.c_str()), "set_cipher"); }
  void setHash(const std::string& h)   { check(rnp_op_encrypt_set_hash(get(), h.c_str()), "set_hash"); }
  void setCompression(const std::string& alg, int level) {
    check(rnp_op_encrypt_set_compression(get(), alg.c_str(), level), "set_compression");
  }
  void setAead(const std::string& alg) {
    check(rnp_op_encrypt_set_aead(get(), alg.empty() ? nullptr : alg.c_str()), "set_aead");
  }
  void setCreationTime(uint64_t t)   { check(rnp_op_encrypt_set_creation_time(get(), t), "set_creation_time"); }
  void setExpirationTime(uint32_t t) { check(rnp_op_encrypt_set_expiration_time(get(), t), "set_expiration_time"); }
  void setFileName(const std::string& n) { check(rnp_op_encrypt_set_file_name(get(), n.c_str()), "set_file_name"); }
  void setFileMtime(uint64_t t)      { check(rnp_op_encrypt_set_file_mtime(get(), t), "set_file_mtime"); }
  void execute()                     { RNPWASM_CATCH(check(rnp_op_encrypt_execute(get()), "rnp_op_encrypt_execute")); }
};

static std::unique_ptr<EncryptOpHandle> op_encrypt_create(FfiHandle& ffi, InputHandle& in, OutputHandle& out) {
  rnp_op_encrypt_t op = nullptr;
  check(rnp_op_encrypt_create(&op, ffi.raw(), in.raw(), out.raw()), "rnp_op_encrypt_create");
  return std::make_unique<EncryptOpHandle>(op);
}

}  // namespace rnpwasm

EMSCRIPTEN_BINDINGS(rnpwasm_encrypt) {
  using namespace rnpwasm;
  using namespace emscripten;

  class_<EncryptOpHandle>("RnpEncryptOpHandle")
    .function("_destroy", &EncryptOpHandle::reset)
    .function("addRecipient",   &EncryptOpHandle::addRecipient, allow_raw_pointers())
    .function("addPassword",    &EncryptOpHandle::addPassword)
    .function("setArmor",       &EncryptOpHandle::setArmor)
    .function("setCipher",      &EncryptOpHandle::setCipher)
    .function("setHash",        &EncryptOpHandle::setHash)
    .function("setCompression", &EncryptOpHandle::setCompression)
    .function("setAead",        &EncryptOpHandle::setAead)
    .function("setCreationTime",   &EncryptOpHandle::setCreationTime)
    .function("setExpirationTime", &EncryptOpHandle::setExpirationTime)
    .function("setFileName",    &EncryptOpHandle::setFileName)
    .function("setFileMtime",   &EncryptOpHandle::setFileMtime)
    .function("execute",        &EncryptOpHandle::execute)
    ;

  function("rnpOpEncryptCreate", &op_encrypt_create, allow_raw_pointers());
}
