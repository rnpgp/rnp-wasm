// src/cpp/bindings/generate.cpp
// Key generation operation bindings.

#include "../error.h"
#include "../handle.h"
#include "ffi.hpp"
#include "key.hpp"

#include <emscripten/bind.h>
#include <rnp/rnp.h>
#include <rnp/rnp_err.h>

#include <memory>
#include <stdexcept>
#include <string>

namespace rnpwasm {

class GenerateOpHandle : public Handle<rnp_op_generate_t, rnp_op_generate_destroy> {
 public:
  explicit GenerateOpHandle(rnp_op_generate_t h) : Handle(h) {}

  GenerateOpHandle& setBits(uint32_t bits)              { check(rnp_op_generate_set_bits(get(), bits), "set_bits"); return *this; }
  GenerateOpHandle& setHash(const std::string& hash)    { check(rnp_op_generate_set_hash(get(), hash.c_str()), "set_hash"); return *this; }
  GenerateOpHandle& setDsaQbits(uint32_t q)             { check(rnp_op_generate_set_dsa_qbits(get(), q), "set_dsa_qbits"); return *this; }
  GenerateOpHandle& setCurve(const std::string& c)      { RNPWASM_CATCH(check(rnp_op_generate_set_curve(get(), c.c_str()), "set_curve")); return *this; }
  GenerateOpHandle& setProtectionPassword(const std::string& pw) {
    check(rnp_op_generate_set_protection_password(get(), pw.c_str()), "set_protection_password"); return *this;
  }
  GenerateOpHandle& setRequestPassword(bool r) {
    check(rnp_op_generate_set_request_password(get(), r), "set_request_password"); return *this;
  }
  GenerateOpHandle& setProtectionCipher(const std::string& c) {
    check(rnp_op_generate_set_protection_cipher(get(), c.c_str()), "set_protection_cipher"); return *this;
  }
  GenerateOpHandle& setProtectionHash(const std::string& h) {
    check(rnp_op_generate_set_protection_hash(get(), h.c_str()), "set_protection_hash"); return *this;
  }
  GenerateOpHandle& setProtectionIterations(uint32_t i) {
    check(rnp_op_generate_set_protection_iterations(get(), i), "set_protection_iterations"); return *this;
  }
  GenerateOpHandle& setProtectionMode(const std::string& m) {
    check(rnp_op_generate_set_protection_mode(get(), m.c_str()), "set_protection_mode"); return *this;
  }
  GenerateOpHandle& addUsage(const std::string& u) {
    check(rnp_op_generate_add_usage(get(), u.c_str()), "add_usage"); return *this;
  }
  GenerateOpHandle& clearUsage()                          { check(rnp_op_generate_clear_usage(get()), "clear_usage"); return *this; }
  GenerateOpHandle& setUserid(const std::string& u)      { check(rnp_op_generate_set_userid(get(), u.c_str()), "set_userid"); return *this; }
  GenerateOpHandle& setExpiration(uint32_t e)            { check(rnp_op_generate_set_expiration(get(), e), "set_expiration"); return *this; }
  GenerateOpHandle& setV6Key() {
#ifdef RNP_EXPERIMENTAL_CRYPTO_REFRESH
    check(rnp_op_generate_set_v6_key(get()), "set_v6_key");
#else
    throw std::runtime_error("v6 keys require ENABLE_CRYPTO_REFRESH build");
#endif
    return *this;
  }

  void execute() { RNPWASM_CATCH(check(rnp_op_generate_execute(get()), "rnp_op_generate_execute")); }

  std::unique_ptr<KeyHandle> getKey() {
    rnp_key_handle_t k = nullptr;
    check(rnp_op_generate_get_key(get(), &k), "rnp_op_generate_get_key");
    return std::make_unique<KeyHandle>(k);
  }
};

static std::unique_ptr<GenerateOpHandle> generate_key_create(FfiHandle& ffi, const std::string& alg) {
  rnp_op_generate_t op = nullptr;
  RNPWASM_CATCH(check(rnp_op_generate_create(&op, ffi.raw(), alg.c_str()), "rnp_op_generate_create"));
  return std::make_unique<GenerateOpHandle>(op);
}

static std::unique_ptr<GenerateOpHandle> generate_subkey_create(FfiHandle& ffi,
                                                                 KeyHandle& primary,
                                                                 const std::string& alg) {
  rnp_op_generate_t op = nullptr;
  RNPWASM_CATCH(check(rnp_op_generate_subkey_create(&op, ffi.raw(), primary.get(), alg.c_str()),
        "rnp_op_generate_subkey_create"));
  return std::make_unique<GenerateOpHandle>(op);
}

static std::string generate_key_json(FfiHandle& ffi, const std::string& json) {
  char* results = nullptr;
  check(rnp_generate_key_json(ffi.raw(), json.c_str(), &results), "rnp_generate_key_json");
  std::string s(results ? results : ""); rnp_buffer_destroy(results); return s;
}

}  // namespace rnpwasm

EMSCRIPTEN_BINDINGS(rnpwasm_generate) {
  using namespace rnpwasm;
  using namespace emscripten;

  class_<GenerateOpHandle>("RnpGenerateOpHandle")
    .function("_destroy", &GenerateOpHandle::reset)
    .function("setBits", &GenerateOpHandle::setBits, return_value_policy::reference())
    .function("setHash", &GenerateOpHandle::setHash, return_value_policy::reference())
    .function("setDsaQbits", &GenerateOpHandle::setDsaQbits, return_value_policy::reference())
    .function("setCurve", &GenerateOpHandle::setCurve, return_value_policy::reference())
    .function("setProtectionPassword", &GenerateOpHandle::setProtectionPassword, return_value_policy::reference())
    .function("setRequestPassword", &GenerateOpHandle::setRequestPassword, return_value_policy::reference())
    .function("setProtectionCipher", &GenerateOpHandle::setProtectionCipher, return_value_policy::reference())
    .function("setProtectionHash", &GenerateOpHandle::setProtectionHash, return_value_policy::reference())
    .function("setProtectionIterations", &GenerateOpHandle::setProtectionIterations, return_value_policy::reference())
    .function("setProtectionMode", &GenerateOpHandle::setProtectionMode, return_value_policy::reference())
    .function("addUsage", &GenerateOpHandle::addUsage, return_value_policy::reference())
    .function("clearUsage", &GenerateOpHandle::clearUsage, return_value_policy::reference())
    .function("setUserid", &GenerateOpHandle::setUserid, return_value_policy::reference())
    .function("setExpiration", &GenerateOpHandle::setExpiration, return_value_policy::reference())
    .function("setV6Key", &GenerateOpHandle::setV6Key, return_value_policy::reference())
    .function("execute", &GenerateOpHandle::execute)
    .function("getKey", &GenerateOpHandle::getKey, allow_raw_pointers())
    ;

  function("rnpGenerateKeyCreate",    &generate_key_create,    allow_raw_pointers());
  function("rnpGenerateSubkeyCreate", &generate_subkey_create, allow_raw_pointers());
  function("rnpGenerateKeyJson",      &generate_key_json,      allow_raw_pointers());
}
