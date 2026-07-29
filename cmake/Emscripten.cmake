# cmake/Emscripten.cmake
# Centralized Emscripten link + compile flags.

# EH must be consistent across Botan, rnp, and the bindings. Botan 3.11+
# uses the native Wasm exception mechanism (-fwasm-exceptions); we match it.
# Mixing -fwasm-exceptions with SjLj objects (-sDISABLE_EXCEPTION_CATCHING=0)
# produces undefined-symbol errors at link time (_Unwind_CallPersonality etc).
#
# Stack must be ≥ 2 MB because EH-enabled Botan frames are large; the WASM
# default of 64 KB overflows deep in the PK_Signer dispatch, surfacing as the
# misleading "null function or function signature mismatch" trap.
set(RNPWASM_EH_FLAG -fwasm-exceptions)

set(RNPWASM_CXX_FLAGS
  -O2
  ${RNPWASM_EH_FLAG}


  -Wall -Wextra
  -Wno-unused-parameter
)

# Async variant uses JSPI (not legacy Asyncify, which is incompatible with
# -fwasm-exceptions that Botan 3.11+ requires). JSPI is link-only; no compile
# flag needed.

function(rnpwasm_apply_link_options target output_name)
  # Async variant: produced when -DRNPWASM_ASYNCIFY=ON is passed to cmake.
  # Uses JSPI (WebAssembly JavaScript Promise Integration) instead of legacy
  # Asyncify because JSPI is compatible with -fwasm-exceptions and Asyncify
  # is not. JSPI exports return Promises natively; callers `await` the result.
  # Cost: a few KB extra runtime, but no significant wasm size growth.
  # Ship as a separate artifact (dist/rnp-async.{js,wasm}) so the default
  # bundle stays sync.
  set(_async_flags "")
  if(RNPWASM_ASYNCIFY)
    set(_async_flags
      -sJSPI=1
      -sJSPI_IMPORTS=[__emval_async]
      -sJSPI_EXPORTS=[rnpDecrypt,rnpOpSignExecute,rnpOpVerifyExecute,rnpOpEncryptExecute]
    )
  endif()

  target_link_options(${target} PRIVATE
    -O1
    -g
    ${RNPWASM_EH_FLAG}
    -sSTACK_SIZE=2MB
    --bind
    -sWASM=1
    -sMODULARIZE=1
    -sEXPORT_ES6=1
    -sUSE_ES6_IMPORT_META=1
    -sENVIRONMENT=web,worker,node
    -sALLOW_MEMORY_GROWTH=1
    -sINITIAL_MEMORY=8388608
    -sMAXIMUM_MEMORY=2147483648
    -sEXPORTED_RUNTIME_METHODS=['HEAPU8','HEAPU32','HEAP8','ccall','cwrap','addFunction','removeFunction','UTF8ToString','stringToUTF8','lengthBytesUTF8','getExceptionMessage','ccall']
    -sEXPORTED_FUNCTIONS=['_malloc','_free']
    -sEXPORT_NAME=RnpModule
    -sFILESYSTEM=1
    -sFORCE_FILESYSTEM=1
    -sUSE_ZLIB=1
    -sUSE_BZIP2=1
    -sALLOW_UNIMPLEMENTED_SYSCALLS=1

    ${_async_flags}
  )

  target_link_libraries(${target} PRIVATE embind)

  set_target_properties(${target} PROPERTIES
    RUNTIME_OUTPUT_DIRECTORY "${CMAKE_SOURCE_DIR}/dist"
    OUTPUT_NAME "${output_name}"
    SUFFIX ".js")
endfunction()
