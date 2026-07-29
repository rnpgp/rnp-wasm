// src/cpp/bindings/io.hpp
#pragma once

#include "../error.h"
#include "../handle.h"

#include <emscripten/val.h>
#include <rnp/rnp.h>

#include <cstdint>
#include <cstring>
#include <memory>
#include <vector>

namespace rnpwasm {

// Base class for all rnp_input_t wrappers. Exposed to JS as "RnpInputHandle"
// so Embind sees a single input type. StreamInputHandle subclasses this via
// `class_<StreamInputHandle, base<InputHandle>>` — JS callers can then pass
// either subtype anywhere an input is required.
class InputHandle : public Handle<rnp_input_t, rnp_input_destroy> {
 public:
  InputHandle() : Handle(nullptr) {}
  explicit InputHandle(rnp_input_t h) : Handle(h) {}
  rnp_input_t raw() const { return get(); }

  static std::unique_ptr<InputHandle> from_bytes(uintptr_t data_ptr, size_t len);
};

class OutputHandle : public Handle<rnp_output_t, rnp_output_destroy> {
 public:
  OutputHandle() : Handle(nullptr) {}
  explicit OutputHandle(rnp_output_t h) : Handle(h) {}
  rnp_output_t raw() const { return get(); }

  static std::unique_ptr<OutputHandle> to_bytes();
  emscripten::val bytes() const;
};

}  // namespace rnpwasm
