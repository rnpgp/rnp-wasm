// src/cpp/bindings/signature.hpp
#pragma once

#include "../handle.h"
#include <rnp/rnp.h>
#include <memory>
#include <string>

namespace rnpwasm {

class SignatureHandle : public Handle<rnp_signature_handle_t, rnp_signature_handle_destroy> {
 public:
  explicit SignatureHandle(rnp_signature_handle_t h) : Handle(h) {}

  std::string type() const;
  std::string alg() const;
  std::string hashAlg() const;
  uint32_t creation() const;
  uint32_t expiration() const;
  uint32_t keyFlags() const;
  bool primaryUid() const;
  std::string keyid() const;
  std::string keyFprint() const;
  std::string signer() const;
  std::string revoker() const;
  std::string revocationReason() const;
  uint32_t trustLevel() const;

  size_t subpacketCount() const;
  size_t errorCount() const;
  std::string errorAt(size_t idx) const;
  bool isValid(uint32_t flags) const;

  std::string packetToJson(uint32_t flags) const;
};

}  // namespace rnpwasm
