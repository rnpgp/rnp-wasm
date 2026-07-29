// src/cpp/bindings/key.hpp
#pragma once

#include "../handle.h"
#include <rnp/rnp.h>
#include <memory>
#include <string>

namespace rnpwasm {

class OutputHandle;  // fwd

class KeyHandle : public Handle<rnp_key_handle_t, rnp_key_handle_destroy> {
 public:
  explicit KeyHandle(rnp_key_handle_t h) : Handle(h) {}

  // Identity
  std::string fingerprint() const;
  std::string keyid() const;
  std::string grip() const;
  std::string primaryGrip() const;
  std::string primaryFprint() const;
  uint32_t version() const;
  std::string alg() const;
  uint32_t bits() const;
  uint32_t dsaQbits() const;
  std::string curve() const;

  // Lifecycle
  uint32_t creation() const;
  uint32_t expiration() const;
  void setExpiration(uint32_t expiry);
  bool isValid() const;
  uint64_t validTill64() const;
  bool isRevoked() const;
  std::string revocationReason() const;
  bool isExpired() const;
  bool isLocked() const;
  void lock();
  void unlock(const std::string& password);
  bool isProtected() const;
  void protect(const std::string& password,
               const std::string& cipher,
               const std::string& hash,
               uint32_t iterations);
  void unprotect(const std::string& password);
  std::string protectionType() const;
  std::string protectionCipher() const;
  std::string protectionHash() const;
  uint32_t protectionIterations() const;

  // State
  bool isPrimary() const;
  bool isSub() const;
  bool haveSecret() const;
  bool havePublic() const;
  size_t subkeyCount() const;
  std::unique_ptr<KeyHandle> subkeyAt(size_t idx) const;

  // UIDs
  std::string primaryUid() const;
  size_t uidCount() const;
  std::string uidAt(size_t idx) const;

  // Serialization
  std::string packetsToJson(uint32_t flags) const;

  // Export / mutation
  void export_(OutputHandle& out, uint32_t flags) const;
  // export_autocrypt: subkey may be nullptr; uid may be empty.
  void export_autocrypt(OutputHandle& out,
                        const KeyHandle* subkey,
                        const std::string& uid,
                        uint32_t flags) const;
  void export_revocation(OutputHandle& out,
                         uint32_t flags,
                         const std::string& hash,
                         const std::string& reason_code,
                         const std::string& reason_text) const;
  void revoke(uint32_t flags,
              const std::string& hash,
              const std::string& reason_code,
              const std::string& reason_text);
  void remove(uint32_t flags);
  // add_uid: full rnp signature. hash may be empty (rnp default); expiration in seconds.
  void add_uid(const std::string& uid,
               const std::string& hash,
               uint32_t expiration,
               uint8_t key_flags,
               bool primary);
};

}  // namespace rnpwasm
