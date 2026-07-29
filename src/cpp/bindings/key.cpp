// src/cpp/bindings/key.cpp
// Key handle: getters, lifecycle (lock/unlock/protect), inspection, mutation.

#include "../accessors.h"
#include "../error.h"
#include "io.hpp"
#include "key.hpp"

#include <emscripten/bind.h>
#include <rnp/rnp.h>

#include <memory>
#include <string>

namespace rnpwasm {

// accessors.h puts templated helpers directly in rnpwasm::, so unqualified
// names are sufficient (the templates live in the current namespace).

std::string KeyHandle::fingerprint() const {
  return get_string([&](char** o){ return rnp_key_get_fprint(get(), o); }, "rnp_key_get_fprint");
}
std::string KeyHandle::keyid() const {
  return get_string([&](char** o){ return rnp_key_get_keyid(get(), o); }, "rnp_key_get_keyid");
}
std::string KeyHandle::grip() const {
  return get_string([&](char** o){ return rnp_key_get_grip(get(), o); }, "rnp_key_get_grip");
}
std::string KeyHandle::primaryGrip() const {
  return get_string([&](char** o){ return rnp_key_get_primary_grip(get(), o); }, "rnp_key_get_primary_grip");
}
std::string KeyHandle::primaryFprint() const {
  return get_string([&](char** o){ return rnp_key_get_primary_fprint(get(), o); }, "rnp_key_get_primary_fprint");
}
std::string KeyHandle::alg() const {
  return get_string([&](char** o){ return rnp_key_get_alg(get(), o); }, "rnp_key_get_alg");
}
std::string KeyHandle::curve() const {
  return get_string([&](char** o){ return rnp_key_get_curve(get(), o); }, "rnp_key_get_curve");
}
std::string KeyHandle::primaryUid() const {
  return get_string([&](char** o){ return rnp_key_get_primary_uid(get(), o); }, "rnp_key_get_primary_uid");
}
std::string KeyHandle::uidAt(size_t idx) const {
  return get_string([&](char** o){ return rnp_key_get_uid_at(get(), idx, o); }, "rnp_key_get_uid_at");
}
std::string KeyHandle::protectionType() const {
  return get_string([&](char** o){ return rnp_key_get_protection_type(get(), o); }, "rnp_key_get_protection_type");
}
std::string KeyHandle::protectionCipher() const {
  return get_string([&](char** o){ return rnp_key_get_protection_cipher(get(), o); }, "rnp_key_get_protection_cipher");
}
std::string KeyHandle::protectionHash() const {
  return get_string([&](char** o){ return rnp_key_get_protection_hash(get(), o); }, "rnp_key_get_protection_hash");
}
std::string KeyHandle::revocationReason() const {
  return get_string_or_empty(
      [&](char** o){ return rnp_key_get_revocation_reason(get(), o); },
      "rnp_key_get_revocation_reason", RNP_ERROR_NOT_FOUND);
}

uint32_t KeyHandle::version() const {
  return get_u32([&](uint32_t* o){ return rnp_key_get_version(get(), o); }, "rnp_key_get_version");
}
uint32_t KeyHandle::bits() const {
  return get_u32([&](uint32_t* o){ return rnp_key_get_bits(get(), o); }, "rnp_key_get_bits");
}
uint32_t KeyHandle::dsaQbits() const {
  return get_u32([&](uint32_t* o){ return rnp_key_get_dsa_qbits(get(), o); }, "rnp_key_get_dsa_qbits");
}
uint32_t KeyHandle::creation() const {
  return get_u32([&](uint32_t* o){ return rnp_key_get_creation(get(), o); }, "rnp_key_get_creation");
}
uint32_t KeyHandle::expiration() const {
  // rnp_key_get_expiration returns RNP_SUCCESS with result=0 when no
  // expiration subpacket is present. We tolerate 0 and return it directly.
  uint32_t v = 0;
  check(rnp_key_get_expiration(get(), &v), "rnp_key_get_expiration");
  return v;
}
uint32_t KeyHandle::protectionIterations() const {
  // rnp_key_get_protection_iterations takes size_t* in rnp 0.18.1.
  size_t v = 0;
  check(rnp_key_get_protection_iterations(get(), &v), "rnp_key_get_protection_iterations");
  return v > UINT32_MAX ? UINT32_MAX : static_cast<uint32_t>(v);
}

uint64_t KeyHandle::validTill64() const {
  return get_u64([&](uint64_t* o){ return rnp_key_valid_till64(get(), o); }, "rnp_key_valid_till64");
}

bool KeyHandle::isValid() const         { return get_bool([&](bool* o){ return rnp_key_is_valid(get(), o); }, "rnp_key_is_valid"); }
bool KeyHandle::isRevoked() const       { return get_bool([&](bool* o){ return rnp_key_is_revoked(get(), o); }, "rnp_key_is_revoked"); }
bool KeyHandle::isExpired() const       { return get_bool([&](bool* o){ return rnp_key_is_expired(get(), o); }, "rnp_key_is_expired"); }
bool KeyHandle::isLocked() const        { return get_bool([&](bool* o){ return rnp_key_is_locked(get(), o); }, "rnp_key_is_locked"); }
bool KeyHandle::isProtected() const     { return get_bool([&](bool* o){ return rnp_key_is_protected(get(), o); }, "rnp_key_is_protected"); }
bool KeyHandle::isPrimary() const       { return get_bool([&](bool* o){ return rnp_key_is_primary(get(), o); }, "rnp_key_is_primary"); }
bool KeyHandle::isSub() const           { return get_bool([&](bool* o){ return rnp_key_is_sub(get(), o); }, "rnp_key_is_sub"); }
bool KeyHandle::haveSecret() const      { return get_bool([&](bool* o){ return rnp_key_have_secret(get(), o); }, "rnp_key_have_secret"); }
bool KeyHandle::havePublic() const      { return get_bool([&](bool* o){ return rnp_key_have_public(get(), o); }, "rnp_key_have_public"); }

size_t KeyHandle::subkeyCount() const {
  return get_size([&](size_t* o){ return rnp_key_get_subkey_count(get(), o); }, "rnp_key_get_subkey_count");
}
size_t KeyHandle::uidCount() const {
  return get_size([&](size_t* o){ return rnp_key_get_uid_count(get(), o); }, "rnp_key_get_uid_count");
}

std::unique_ptr<KeyHandle> KeyHandle::subkeyAt(size_t idx) const {
  rnp_key_handle_t sub = nullptr;
  check(rnp_key_get_subkey_at(get(), idx, &sub), "rnp_key_get_subkey_at");
  return std::make_unique<KeyHandle>(sub);
}

void KeyHandle::setExpiration(uint32_t expiry) {
  check(rnp_key_set_expiration(get(), expiry), "rnp_key_set_expiration");
}
void KeyHandle::lock() {
  check(rnp_key_lock(get()), "rnp_key_lock");
}
void KeyHandle::unlock(const std::string& password) {
  check(rnp_key_unlock(get(), password.c_str()), "rnp_key_unlock");
}
void KeyHandle::protect(const std::string& password,
                        const std::string& cipher,
                        const std::string& hash,
                        uint32_t iterations) {
  // rnp_key_protect(handle, password, cipher, cipher_mode, hash, iterations)
  check(rnp_key_protect(get(), password.c_str(),
                        cipher.empty() ? nullptr : cipher.c_str(),
                        /* cipher_mode */ nullptr,
                        hash.empty()   ? nullptr : hash.c_str(),
                        iterations),
        "rnp_key_protect");
}
void KeyHandle::unprotect(const std::string& password) {
  check(rnp_key_unprotect(get(), password.c_str()), "rnp_key_unprotect");
}

std::string KeyHandle::packetsToJson(uint32_t flags) const {
  char* json = nullptr;
  check(rnp_key_packets_to_json(get(), false, flags, &json), "rnp_key_packets_to_json");
  std::string s(json ? json : "");
  rnp_buffer_destroy(json);
  return s;
}

void KeyHandle::export_(OutputHandle& out, uint32_t flags) const {
  check(rnp_key_export(get(), out.raw(), flags), "rnp_key_export");
}

void KeyHandle::export_autocrypt(OutputHandle& out,
                                const KeyHandle* subkey,
                                const std::string& uid,
                                uint32_t flags) const {
  check(rnp_key_export_autocrypt(get(),
                                 subkey ? subkey->get() : nullptr,
                                 uid.empty() ? nullptr : uid.c_str(),
                                 out.raw(), flags),
        "rnp_key_export_autocrypt");
}

void KeyHandle::export_revocation(OutputHandle& out,
                                  uint32_t flags,
                                  const std::string& hash,
                                  const std::string& reason_code,
                                  const std::string& reason_text) const {
  check(rnp_key_export_revocation(get(), out.raw(), flags,
                                  hash.empty() ? nullptr : hash.c_str(),
                                  reason_code.empty() ? nullptr : reason_code.c_str(),
                                  reason_text.empty() ? nullptr : reason_text.c_str()),
        "rnp_key_export_revocation");
}

void KeyHandle::revoke(uint32_t flags,
                       const std::string& hash,
                       const std::string& reason_code,
                       const std::string& reason_text) {
  check(rnp_key_revoke(get(), flags,
                       hash.empty() ? nullptr : hash.c_str(),
                       reason_code.empty() ? nullptr : reason_code.c_str(),
                       reason_text.empty() ? nullptr : reason_text.c_str()),
        "rnp_key_revoke");
}

void KeyHandle::remove(uint32_t flags) {
  check(rnp_key_remove(get(), flags), "rnp_key_remove");
}

void KeyHandle::add_uid(const std::string& uid,
                        const std::string& hash,
                        uint32_t expiration,
                        uint8_t key_flags,
                        bool primary) {
  check(rnp_key_add_uid(get(),
                        uid.c_str(),
                        hash.empty() ? nullptr : hash.c_str(),
                        expiration,
                        key_flags,
                        primary),
        "rnp_key_add_uid");
}

}  // namespace rnpwasm

EMSCRIPTEN_BINDINGS(rnpwasm_key) {
  using namespace rnpwasm;
  using namespace emscripten;

  // No `.constructor<>()` — see TODO 45.
  class_<KeyHandle>("RnpKeyHandle")
    .function("_destroy", &KeyHandle::reset)
    .function("fingerprint",        &KeyHandle::fingerprint)
    .function("keyid",              &KeyHandle::keyid)
    .function("grip",               &KeyHandle::grip)
    .function("primaryGrip",        &KeyHandle::primaryGrip)
    .function("primaryFingerprint", &KeyHandle::primaryFprint)
    .function("version",            &KeyHandle::version)
    .function("alg",                &KeyHandle::alg)
    .function("bits",               &KeyHandle::bits)
    .function("dsaQbits",           &KeyHandle::dsaQbits)
    .function("curve",              &KeyHandle::curve)
    .function("creation",           &KeyHandle::creation)
    .function("expiration",         &KeyHandle::expiration)
    .function("setExpiration",      &KeyHandle::setExpiration)
    .function("isValid",            &KeyHandle::isValid)
    .function("validTill64",        &KeyHandle::validTill64)
    .function("isRevoked",          &KeyHandle::isRevoked)
    .function("revocationReason",   &KeyHandle::revocationReason)
    .function("isExpired",          &KeyHandle::isExpired)
    .function("isLocked",           &KeyHandle::isLocked)
    .function("lock",               &KeyHandle::lock)
    .function("unlock",             &KeyHandle::unlock)
    .function("isProtected",        &KeyHandle::isProtected)
    .function("protect",            &KeyHandle::protect)
    .function("unprotect",          &KeyHandle::unprotect)
    .function("protectionType",     &KeyHandle::protectionType)
    .function("protectionCipher",   &KeyHandle::protectionCipher)
    .function("protectionHash",     &KeyHandle::protectionHash)
    .function("protectionIterations",&KeyHandle::protectionIterations)
    .function("isPrimary",          &KeyHandle::isPrimary)
    .function("isSub",              &KeyHandle::isSub)
    .function("haveSecret",         &KeyHandle::haveSecret)
    .function("havePublic",         &KeyHandle::havePublic)
    .function("subkeyCount",        &KeyHandle::subkeyCount)
    .function("subkeyAt",           &KeyHandle::subkeyAt, allow_raw_pointers())
    .function("primaryUid",         &KeyHandle::primaryUid)
    .function("uidCount",           &KeyHandle::uidCount)
    .function("uidAt",              &KeyHandle::uidAt)
    .function("packetsToJson",      &KeyHandle::packetsToJson)
    .function("export",             &KeyHandle::export_, allow_raw_pointers())
    .function("exportAutocrypt",    &KeyHandle::export_autocrypt, allow_raw_pointers())
    .function("exportRevocation",   &KeyHandle::export_revocation, allow_raw_pointers())
    .function("revoke",             &KeyHandle::revoke)
    .function("remove",             &KeyHandle::remove)
    .function("addUid",             &KeyHandle::add_uid)
    ;
}
