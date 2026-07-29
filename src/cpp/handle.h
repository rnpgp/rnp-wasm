// src/cpp/handle.h
// RAII wrapper template for rnp opaque handle types.
//
// rnp's C API returns handles the caller must destroy explicitly. Embind
// doesn't do this automatically — a C++ class owning the handle via unique_ptr
// with a custom deleter makes lifetime safe and JS-FinalizationRegistry-friendly.
//
// Usage:
//   class KeyHandle : public Handle<rnp_key_handle_t, rnp_key_handle_destroy> {
//    public:
//     explicit KeyHandle(rnp_key_handle_t h) : Handle(h) {}
//     ...
//   };

#pragma once

#include <functional>
#include <memory>
#include <stdexcept>
#include <string>

#include <rnp/rnp.h>
#include <rnp/rnp_err.h>

namespace rnpwasm {

// Generic RAII owner. T is the opaque handle type; DestroyFn is a function
// accepting T and returning rnp_result_t (we ignore the result on cleanup).
template <typename T, rnp_result_t (*DestroyFn)(T)>
class Handle {
 public:
  Handle() = default;
  explicit Handle(T ptr) : ptr_(ptr) {}
  virtual ~Handle() { reset(); }

  Handle(const Handle&) = delete;
  Handle& operator=(const Handle&) = delete;

  Handle(Handle&& other) noexcept : ptr_(other.ptr_) { other.ptr_ = nullptr; }
  Handle& operator=(Handle&& other) noexcept {
    if (this != &other) {
      reset();
      ptr_ = other.ptr_;
      other.ptr_ = nullptr;
    }
    return *this;
  }

  void reset() {
    if (ptr_) {
      DestroyFn(ptr_);
      ptr_ = nullptr;
    }
  }

  T get() const { return ptr_; }
  T release() { T t = ptr_; ptr_ = nullptr; return t; }
  explicit operator bool() const { return ptr_ != nullptr; }

 protected:
  // Throw helper for subclass methods. Centralizes the rnp error → C++ throw
  // translation so subclasses stay terse.
  static void check(rnp_result_t result, const std::string& ctx) {
    if (result != RNP_SUCCESS) {
      throw std::runtime_error(ctx + ": " + rnp_result_to_string(result));
    }
  }

 private:
  T ptr_ = nullptr;
};

}  // namespace rnpwasm

// ---- ChildHandle: for op-owned sub-handles with no destroy fn ----------------
//
// Some rnp types (rnp_op_sign_signature_t, rnp_op_verify_signature_t,
// rnp_recipient_handle_t, rnp_symenc_handle_t) have no `*_destroy` function
// in rnp 0.18.1 — their lifetime is bound to the parent operation. Wrapping
// them in `Handle<T, ...>` is impossible because the destroy template
// parameter has nothing to call.
//
// ChildHandle provides the same lifetime-tracking shape (alive flag, get(),
// reset() that nulls without freeing) but documents that destruction is the
// parent's responsibility.

namespace rnpwasm {

template <typename T>
class ChildHandle {
 public:
  ChildHandle() = default;
  explicit ChildHandle(T ptr) : ptr_(ptr) {}
  ~ChildHandle() = default;  // No destroy — parent owns the resource.

  ChildHandle(const ChildHandle&) = delete;
  ChildHandle& operator=(const ChildHandle&) = delete;
  ChildHandle(ChildHandle&& o) noexcept : ptr_(o.ptr_) { o.ptr_ = nullptr; }
  ChildHandle& operator=(ChildHandle&& o) noexcept {
    if (this != &o) { ptr_ = o.ptr_; o.ptr_ = nullptr; }
    return *this;
  }

  // reset() releases OUR reference to the pointer but does NOT free the
  // underlying rnp resource. Use this when the parent is being destroyed
  // and we want to mark ourselves inactive.
  void reset() { ptr_ = nullptr; }

  T get() const { return ptr_; }
  explicit operator bool() const { return ptr_ != nullptr; }

 protected:
  T ptr_ = nullptr;
};

}  // namespace rnpwasm
