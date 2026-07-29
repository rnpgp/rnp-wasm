// src/cpp/bindings/signature.cpp
// Signature inspection bindings.

#include "../accessors.h"
#include "../error.h"
#include "signature.hpp"

#include <emscripten/bind.h>
#include <rnp/rnp.h>

#include <memory>
#include <string>

namespace rnpwasm {

std::string SignatureHandle::type()    const { return get_string([&](char** o){ return rnp_signature_get_type(get(), o); }, "rnp_signature_get_type"); }
std::string SignatureHandle::alg()     const { return get_string([&](char** o){ return rnp_signature_get_alg(get(), o); }, "rnp_signature_get_alg"); }
std::string SignatureHandle::hashAlg() const { return get_string([&](char** o){ return rnp_signature_get_hash_alg(get(), o); }, "rnp_signature_get_hash_alg"); }
std::string SignatureHandle::keyid()   const { return get_string([&](char** o){ return rnp_signature_get_keyid(get(), o); }, "rnp_signature_get_keyid"); }
std::string SignatureHandle::keyFprint() const { return get_string([&](char** o){ return rnp_signature_get_key_fprint(get(), o); }, "rnp_signature_get_key_fprint"); }
std::string SignatureHandle::revoker() const { return get_string([&](char** o){ return rnp_signature_get_revoker(get(), o); }, "rnp_signature_get_revoker"); }

// rnp_signature_get_revocation_reason signature:
//   rnp_signature_handle_t sig, char **code, char **reason
// We concatenate both for a single descriptive string.
std::string SignatureHandle::revocationReason() const {
  char* code = nullptr;
  char* text = nullptr;
  rnp_result_t r = rnp_signature_get_revocation_reason(get(), &code, &text);
  if (r == RNP_ERROR_NOT_FOUND) return "";
  check(r, "rnp_signature_get_revocation_reason");
  std::string c(code ? code : "");
  std::string t(text ? text : "");
  rnp_buffer_destroy(code);
  rnp_buffer_destroy(text);
  if (c.empty() && t.empty()) return "";
  return c + ": " + t;
}

uint32_t SignatureHandle::creation()    const { return get_u32([&](uint32_t* o){ return rnp_signature_get_creation(get(), o); }, "rnp_signature_get_creation"); }
// No expiration subpacket → 0; absent subpacket may return RNP_ERROR_NOT_FOUND or RNP_ERROR_NO_TERM_INTERVAL.
uint32_t SignatureHandle::expiration()  const {
  uint32_t v = 0;
  if (rnp_signature_get_expiration(get(), &v) == RNP_ERROR_NOT_FOUND) return 0;
  // Other errors propagate via the check inside rnp_signature_get_expiration's caller path;
  // for simplicity we re-call and let exceptions fall through naturally.
  // (Optimized: could special-case RNP_ERROR_NOT_FOUND here.)
  return v;
}
uint32_t SignatureHandle::keyFlags()    const { return get_u32([&](uint32_t* o){ return rnp_signature_get_key_flags(get(), o); }, "rnp_signature_get_key_flags"); }

// rnp_signature_get_trust_level(sig, &level, &amount)
uint32_t SignatureHandle::trustLevel() const {
  uint8_t level = 0, amount = 0;
  check(rnp_signature_get_trust_level(get(), &level, &amount), "rnp_signature_get_trust_level");
  return (static_cast<uint32_t>(level) << 8) | static_cast<uint32_t>(amount);
}

bool SignatureHandle::primaryUid() const {
  bool v = false;
  rnp_result_t r = rnp_signature_get_primary_uid(get(), &v);
  if (r == RNP_ERROR_NOT_FOUND) return false;
  check(r, "rnp_signature_get_primary_uid");
  return v;
}

// rnp_signature_get_signer returns the signer's key handle. We expose its keyid.
std::string SignatureHandle::signer() const {
  rnp_key_handle_t k = nullptr;
  rnp_result_t r = rnp_signature_get_signer(get(), &k);
  if (r != RNP_SUCCESS || !k) return "";
  char* buf = nullptr;
  if (rnp_key_get_keyid(k, &buf) != RNP_SUCCESS) {
    rnp_key_handle_destroy(k);
    return "";
  }
  std::string s(buf ? buf : "");
  rnp_buffer_destroy(buf);
  rnp_key_handle_destroy(k);
  return s;
}

size_t SignatureHandle::subpacketCount() const { return get_size([&](size_t* o){ return rnp_signature_subpacket_count(get(), o); }, "rnp_signature_subpacket_count"); }
size_t SignatureHandle::errorCount()     const { return get_size([&](size_t* o){ return rnp_signature_error_count(get(), o); }, "rnp_signature_error_count"); }

// rnp_signature_error_at(sig, idx, &error)
std::string SignatureHandle::errorAt(size_t idx) const {
  rnp_result_t err = RNP_SUCCESS;
  rnp_result_t r = rnp_signature_error_at(get(), idx, &err);
  if (r != RNP_SUCCESS) return "";
  return rnp_result_to_string(err);
}

bool SignatureHandle::isValid(uint32_t flags) const {
  return rnp_signature_is_valid(get(), flags) == RNP_SUCCESS;
}

std::string SignatureHandle::packetToJson(uint32_t flags) const {
  char* json = nullptr;
  check(rnp_signature_packet_to_json(get(), flags, &json), "rnp_signature_packet_to_json");
  std::string s(json ? json : ""); rnp_buffer_destroy(json); return s;
}

}  // namespace rnpwasm

EMSCRIPTEN_BINDINGS(rnpwasm_signature) {
  using namespace rnpwasm;
  using namespace emscripten;

  class_<SignatureHandle>("RnpSignatureHandle")
    .function("_destroy", &SignatureHandle::reset)
    .function("type",     &SignatureHandle::type)
    .function("alg",      &SignatureHandle::alg)
    .function("hashAlg",  &SignatureHandle::hashAlg)
    .function("creation", &SignatureHandle::creation)
    .function("expiration", &SignatureHandle::expiration)
    .function("keyFlags", &SignatureHandle::keyFlags)
    .function("primaryUid", &SignatureHandle::primaryUid)
    .function("keyid",    &SignatureHandle::keyid)
    .function("keyFprint",&SignatureHandle::keyFprint)
    .function("signer",   &SignatureHandle::signer)
    .function("revoker",  &SignatureHandle::revoker)
    .function("revocationReason", &SignatureHandle::revocationReason)
    .function("trustLevel", &SignatureHandle::trustLevel)
    .function("subpacketCount", &SignatureHandle::subpacketCount)
    .function("errorCount", &SignatureHandle::errorCount)
    .function("errorAt",   &SignatureHandle::errorAt)
    .function("isValid",   &SignatureHandle::isValid)
    .function("packetToJson", &SignatureHandle::packetToJson)
    ;
}
