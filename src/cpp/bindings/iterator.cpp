// src/cpp/bindings/iterator.cpp
// Identifier iterator: enumerate keys in a keyring without prior knowledge.

#include "../accessors.h"
#include "../error.h"
#include "../handle.h"
#include "ffi.hpp"

#include <emscripten/bind.h>
#include <rnp/rnp.h>

#include <memory>
#include <string>

namespace rnpwasm {

class IdentifierIteratorHandle
    : public Handle<rnp_identifier_iterator_t, rnp_identifier_iterator_destroy> {
 public:
  explicit IdentifierIteratorHandle(rnp_identifier_iterator_t h) : Handle(h) {}

  // Returns the next identifier, or empty string when exhausted.
  // rnp docs: the returned buffer is owned by the iterator — do not free.
  std::string next() {
    const char* item = nullptr;
    check(rnp_identifier_iterator_next(get(), &item), "rnp_identifier_iterator_next");
    // item is nullptr when iteration completes.
    return item ? std::string(item) : std::string();
  }
};

static std::unique_ptr<IdentifierIteratorHandle>
identifier_iterator_create(FfiHandle& ffi, const std::string& item_type) {
  rnp_identifier_iterator_t it = nullptr;
  check(rnp_identifier_iterator_create(ffi.raw(), &it, item_type.c_str()),
        "rnp_identifier_iterator_create");
  return std::make_unique<IdentifierIteratorHandle>(it);
}

}  // namespace rnpwasm

EMSCRIPTEN_BINDINGS(rnpwasm_iterator) {
  using namespace rnpwasm;
  using namespace emscripten;

  class_<IdentifierIteratorHandle>("RnpIdentifierIterator")
    .function("_destroy", &IdentifierIteratorHandle::reset)
    .function("next",     &IdentifierIteratorHandle::next)
    ;

  function("rnpIdentifierIteratorCreate", &identifier_iterator_create, allow_raw_pointers());
}
