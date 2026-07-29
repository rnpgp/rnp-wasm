// src/cpp/accessors.h
// Shared getter helpers for the rnp char**/uint32_t*/bool*/size_t* out-param pattern.
// Centralizes buffer_free discipline and "missing optional field" tolerance.

#pragma once

#include "error.h"

#include <rnp/rnp.h>

#include <cstdint>
#include <cstring>
#include <string>

namespace rnpwasm {

// String getter: calls fn(&char*) → copies to std::string → frees buffer.
template <typename Fn>
std::string get_string(Fn&& fn, const char* ctx) {
  char* buf = nullptr;
  check(fn(&buf), ctx);
  std::string s(buf ? buf : "");
  rnp_buffer_destroy(buf);
  return s;
}

// Same, but tolerates one specific non-success code (returns "").
// Used for fields like signature expiration that may not be present.
template <typename Fn>
std::string get_string_or_empty(Fn&& fn, const char* ctx, rnp_result_t tolerate) {
  char* buf = nullptr;
  rnp_result_t r = fn(&buf);
  if (r == tolerate) return "";
  check(r, ctx);
  std::string s(buf ? buf : "");
  rnp_buffer_destroy(buf);
  return s;
}

template <typename Fn>
uint32_t get_u32(Fn&& fn, const char* ctx) {
  uint32_t v = 0;
  check(fn(&v), ctx);
  return v;
}

// u32 getter that tolerates one non-success code (returns the fallback).
template <typename Fn>
uint32_t get_u32_or(Fn&& fn, const char* ctx, rnp_result_t tolerate, uint32_t fallback) {
  uint32_t v = 0;
  rnp_result_t r = fn(&v);
  if (r == tolerate) return fallback;
  check(r, ctx);
  return v;
}

template <typename Fn>
uint64_t get_u64(Fn&& fn, const char* ctx) {
  uint64_t v = 0;
  check(fn(&v), ctx);
  return v;
}

template <typename Fn>
bool get_bool(Fn&& fn, const char* ctx) {
  bool v = false;
  check(fn(&v), ctx);
  return v;
}

template <typename Fn>
size_t get_size(Fn&& fn, const char* ctx) {
  size_t v = 0;
  check(fn(&v), ctx);
  return v;
}

// Data getter for void**/size_t* out-params (UID data, subpacket data).
// Copies into std::string (binary-safe).
template <typename Fn>
std::string get_data(Fn&& fn, const char* ctx) {
  void* p = nullptr;
  size_t len = 0;
  check(fn(&p, &len), ctx);
  std::string s(static_cast<const char*>(p), len);
  rnp_buffer_destroy(p);
  return s;
}

}  // namespace rnpwasm
