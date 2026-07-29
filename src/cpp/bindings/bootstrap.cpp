// src/cpp/bindings/bootstrap.cpp
// One-shot introspection: queries rnp_supported_features for every type and
// returns a single JSON document describing what this build supports.
//
// Used by the TS layer (TODO 63) to populate the algorithm registry at
// module init, and by CI to capture a build-time feature snapshot at
// dist/features.json.

#include "../error.h"

#include <emscripten/bind.h>
#include <rnp/rnp.h>

#include <string>

namespace rnpwasm {

static std::string query_feature_type(const char* type) {
  char* result = nullptr;
  if (rnp_supported_features(type, &result) != RNP_SUCCESS) return "[]";
  std::string s(result ? result : "[]");
  rnp_buffer_destroy(result);
  return s;
}

// Returns a JSON document like:
//   {
//     "rnpVersion": "0.18.1",
//     "symmetric": [...],
//     "aead": [...],
//     "hash": [...],
//     "cipher": [...],
//     "compression": [...],
//     "asymmetric": [...],
//     "curve": [...],
//     "protection": [...],
//     "s2k": [...]
//   }
//
// The JSON keys are short slugs ("symmetric", "hash", ...) for caller
// convenience; internally we translate them to rnp's RNP_FEATURE_* string
// constants ("symmetric algorithm", "hash algorithm", ...) which is what
// rnp_supported_features actually matches against.
static std::string bootstrap_features() {
  struct FeatureMapping { const char* slug; const char* rnp_type; };
  static constexpr FeatureMapping mappings[] = {
    {"symmetric",    RNP_FEATURE_SYMM_ALG},
    {"aead",         RNP_FEATURE_AEAD_ALG},
    {"hash",         RNP_FEATURE_HASH_ALG},
    {"compression",  RNP_FEATURE_COMP_ALG},
    {"asymmetric",   RNP_FEATURE_PK_ALG},
    {"curve",        RNP_FEATURE_CURVE},
  };
  std::string out = "{";
  out += "\"rnpVersion\":\"" + std::string(rnp_version_string()) + "\"";
  for (const auto& m : mappings) {
    out += ",\"" + std::string(m.slug) + "\":" + query_feature_type(m.rnp_type);
  }
  // Slugs with no rnp equivalent — leave as empty arrays so the shape is stable.
  out += ",\"cipher\":[]";
  out += ",\"protection\":[]";
  out += ",\"s2k\":[]";
  out += "}";
  return out;
}

}  // namespace rnpwasm

EMSCRIPTEN_BINDINGS(rnpwasm_bootstrap) {
  using namespace rnpwasm;
  emscripten::function("rnpBootstrapFeatures", &bootstrap_features);
}
