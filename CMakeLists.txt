# rnp-wasm — top-level CMakeLists.txt
# Compiles the Embind glue and links against pre-built librnp.a + libbotan-3.a.

cmake_minimum_required(VERSION 3.16)

# Cache variable so subdirectory CMakeLists can access DEPS_PREFIX.
# When invoked with -DEPS_PREFIX=... via the build scripts.
project(rnp_wasm
  VERSION 0.0.0
  DESCRIPTION "WASM build of rnp with TypeScript-friendly Embind bindings"
  LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)
set(CMAKE_POSITION_INDEPENDENT_CODE OFF)

# ---------------------------------------------------------------- options
set(RNPWASM_VARIANT "default" CACHE STRING "Build variant (default|pqc|brainpool|sm)")
set(RNPWASM_OUTPUT_NAME "rnp" CACHE STRING "Output basename (without extension)")
option(RNPWASM_ASYNCIFY "Enable Asyncify (needed for async password providers)" OFF)

# ---------------------------------------------------------------- toolchain
if(NOT EMSCRIPTEN)
  message(FATAL_ERROR
    "This CMake project must be configured with emcmake. "
    "Run: emcmake cmake -B build -S .")
endif()

list(APPEND CMAKE_MODULE_PATH "${CMAKE_CURRENT_SOURCE_DIR}/cmake")
include(Emscripten)
include(SystemDeps)
include(ImportedLib)

# ---------------------------------------------------------------- inputs
set(RNP_LIB_DIR "" CACHE PATH "Directory containing librnp.a")
set(RNP_INCLUDE_DIR "" CACHE PATH "Directory containing rnp/rnp.h")
set(RNP_GENERATED_INCLUDE_DIR "" CACHE PATH "Directory containing generated rnp_export.h")
set(BOTAN_INCLUDE_DIR "" CACHE PATH "Botan include dir (botan-3)")
set(BOTAN_LIBRARY "" CACHE FILEPATH "Path to libbotan-3.a")

if(NOT RNP_LIB_DIR OR NOT RNP_INCLUDE_DIR)
  message(FATAL_ERROR
    "RNP_LIB_DIR and RNP_INCLUDE_DIR must point at the built rnp. "
    "Usually these are set by scripts/build-bindings.sh.")
endif()

if(NOT EXISTS "${RNP_LIB_DIR}/librnp.a")
  message(FATAL_ERROR "librnp.a not found at ${RNP_LIB_DIR}/librnp.a")
endif()
if(NOT EXISTS "${BOTAN_LIBRARY}")
  message(FATAL_ERROR "Botan library not found at ${BOTAN_LIBRARY}")
endif()

add_library(rnp_static STATIC IMPORTED)
set_target_properties(rnp_static PROPERTIES
  IMPORTED_LOCATION "${RNP_LIB_DIR}/librnp.a")

add_library(botan_static STATIC IMPORTED)
set_target_properties(botan_static PROPERTIES
  IMPORTED_LOCATION "${BOTAN_LIBRARY}")

# sexpp + json-c are optional dep archives that may live alongside librnp.a
# or under the deps prefix. The actual binding target links them via
# rnpwasm_link_imported() in src/cpp/CMakeLists.txt so the probe candidates
# live next to the consumer.

# ---------------------------------------------------------------- bindings
add_subdirectory(src/cpp)
