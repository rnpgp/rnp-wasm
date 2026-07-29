// src/cpp/bindings/uid.cpp
// UID handle bindings.

#include "../error.h"
#include "../handle.h"
#include "signature.hpp"

#include <emscripten/bind.h>
#include <rnp/rnp.h>

#include <memory>
#include <string>

namespace rnpwasm {

class UidHandle : public Handle<rnp_uid_handle_t, rnp_uid_handle_destroy> {
 public:
  explicit UidHandle(rnp_uid_handle_t h) : Handle(h) {}

  uint32_t type() const {
    uint32_t v = 0;
    check(rnp_uid_get_type(get(), &v), "rnp_uid_get_type");
    return v;
  }
  std::string data() const {
    void* p = nullptr;
    size_t len = 0;
    check(rnp_uid_get_data(get(), &p, &len), "rnp_uid_get_data");
    std::string s(static_cast<const char*>(p), len);
    rnp_buffer_destroy(p);
    return s;
  }
  bool isPrimary() const { bool v=false; check(rnp_uid_is_primary(get(), &v), "rnp_uid_is_primary"); return v; }
  bool isValid() const   { bool v=false; check(rnp_uid_is_valid(get(), &v),   "rnp_uid_is_valid");   return v; }
  bool isRevoked() const { bool v=false; check(rnp_uid_is_revoked(get(), &v), "rnp_uid_is_revoked"); return v; }

  size_t signatureCount() const {
    size_t v = 0;
    check(rnp_uid_get_signature_count(get(), &v), "rnp_uid_get_signature_count");
    return v;
  }
  std::unique_ptr<SignatureHandle> signatureAt(size_t idx) const {
    rnp_signature_handle_t s = nullptr;
    check(rnp_uid_get_signature_at(get(), idx, &s), "rnp_uid_get_signature_at");
    return std::make_unique<SignatureHandle>(s);
  }
};

}  // namespace rnpwasm

EMSCRIPTEN_BINDINGS(rnpwasm_uid) {
  using namespace rnpwasm;
  using namespace emscripten;

  class_<UidHandle>("RnpUidHandle")
    .function("_destroy", &UidHandle::reset)
    .function("type",       &UidHandle::type)
    .function("data",       &UidHandle::data)
    .function("isPrimary",  &UidHandle::isPrimary)
    .function("isValid",    &UidHandle::isValid)
    .function("isRevoked",  &UidHandle::isRevoked)
    .function("signatureCount", &UidHandle::signatureCount)
    .function("signatureAt", &UidHandle::signatureAt, allow_raw_pointers())
    ;
}
