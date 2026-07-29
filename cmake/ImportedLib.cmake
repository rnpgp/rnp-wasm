# cmake/ImportedLib.cmake
# DRY helper for discovering and linking a static .a archive.
#
# Usage:
#   rnpwasm_link_imported(<target> <imported-target-name> <libname> [PATHS path1 path2 ...])
#
# Probes each candidate path; on first hit, creates an IMPORTED STATIC library
# named <imported-target-name> and links it into <target>. Emits a STATUS
# message on success, WARNING on failure.

function(rnpwasm_link_imported target imported_target lib_name)
  # Parse: rest of args are PATHS <path1> <path2> ...
  set(args ${ARGN})
  if(args STREQUAL "")
    message(FATAL_ERROR "rnpwasm_link_imported: PATHS keyword is required")
  endif()
  list(GET args 0 keyword)
  if(NOT keyword STREQUAL "PATHS")
    message(FATAL_ERROR "rnpwasm_link_imported: expected 'PATHS' keyword, got '${keyword}'")
  endif()
  list(REMOVE_AT args 0)
  set(candidate_paths ${args})

  set(_found "")
  foreach(_p IN LISTS candidate_paths)
    if(EXISTS "${_p}")
      set(_found "${_p}")
      break()
    endif()
  endforeach()

  if(_found)
    add_library(${imported_target} STATIC IMPORTED GLOBAL)
    set_target_properties(${imported_target} PROPERTIES IMPORTED_LOCATION "${_found}")
    target_link_libraries(${target} PRIVATE ${imported_target})
    message(STATUS "${lib_name}: ${_found}")
  else()
    message(WARNING "${lib_name} not found in any of: ${candidate_paths}")
  endif()
endfunction()
