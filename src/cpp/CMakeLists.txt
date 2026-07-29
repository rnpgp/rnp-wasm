# src/cpp/CMakeLists.txt
# Builds the bindings glue and links the final WASM module.

set(BINDING_SOURCES
  entry.cpp
  shim_entropy.cpp
  shim_clock.cpp
  shim_fs.cpp
  trampoline.cpp
  bindings/ffi.cpp
  bindings/io.cpp
  bindings/keyring.cpp
  bindings/key.cpp
  bindings/uid.cpp
  bindings/signature.cpp
  bindings/generate.cpp
  bindings/sign.cpp
  bindings/verify.cpp
  bindings/encrypt.cpp
  bindings/decrypt.cpp
  bindings/dump.cpp
  bindings/iterator.cpp
  bindings/stream.cpp
  bindings/bootstrap.cpp
)

add_executable(rnpwasm_bindings ${BINDING_SOURCES})

target_include_directories(rnpwasm_bindings PRIVATE
  ${CMAKE_CURRENT_SOURCE_DIR}
  ${RNP_INCLUDE_DIR}
  ${BOTAN_INCLUDE_DIR}
)

if(RNP_GENERATED_INCLUDE_DIR)
  target_include_directories(rnpwasm_bindings PRIVATE ${RNP_GENERATED_INCLUDE_DIR})
endif()

target_compile_features(rnpwasm_bindings PRIVATE cxx_std_17)
target_compile_options(rnpwasm_bindings PRIVATE ${RNPWASM_CXX_FLAGS})
target_compile_definitions(rnpwasm_bindings PRIVATE RNP_STATIC=1)

# Core link set: rnp + botan. These are always present.
target_link_libraries(rnpwasm_bindings PRIVATE "-Wl,--whole-archive" rnp_static botan_static "-Wl,--no-whole-archive")

# zlib/bzip2: prefer cmake-discovered targets; the Emscripten ports are also
# pulled in via -sUSE_ZLIB=1 / -sUSE_BZIP2=1 in cmake/Emscripten.cmake.
if(TARGET ZLIB::ZLIB)
  target_link_libraries(rnpwasm_bindings PRIVATE ZLIB::ZLIB)
endif()
if(TARGET BZip2::BZip2)
  target_link_libraries(rnpwasm_bindings PRIVATE BZip2::BZip2)
endif()

# sexpp (bundled with rnp when SYSTEM_LIBSEXPP=OFF) and json-c (needed by
# rnp for G10 key files). Probe standard locations via the DRY helper.
rnpwasm_link_imported(rnpwasm_bindings sexpp_static libsexpp
  PATHS
    "${RNP_LIB_DIR}/libsexpp.a"
    "${RNP_LIB_DIR}/lib/libsexpp.a"
    "${RNP_LIB_DIR}/../src/libsexpp/lib/libsexpp.a"
    "${RNP_LIB_DIR}/../../lib/libsexpp.a"
    "${DEPS_PREFIX}/lib/libsexpp.a"
)

rnpwasm_link_imported(rnpwasm_bindings jsonc_static libjson-c
  PATHS
    "${DEPS_PREFIX}/lib/libjson-c.a"
    "${RNP_LIB_DIR}/libjson-c.a"
    "${RNP_LIB_DIR}/lib/libjson-c.a"
)

rnpwasm_apply_link_options(rnpwasm_bindings ${RNPWASM_OUTPUT_NAME})
