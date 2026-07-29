# cmake/Variants.cmake
# Central definition of build variants (TODO 43). Each variant is a struct:
#   name: lowercase identifier
#   rnp_cache_vars: KEY=VALUE pairs passed to rnp's CMake
#   botan_extra_modules: appended to BOTAN_MODULES_DEFAULT in build-deps.sh

set(RNPWASM_VARIANTS
  default
  pqc
  brainpool
  sm
)

set(VARIANT_default_rnp "")
set(VARIANT_default_botan "")

set(VARIANT_pqc_rnp "ENABLE_PQC=ON")
set(VARIANT_pqc_botan "ml_kem ml_dsa slh_dsa kyber dilithium")

set(VARIANT_brainpool_rnp "ENABLE_BRAINPOOL=ON")
set(VARIANT_brainpool_botan "brainpool")

set(VARIANT_sm_rnp "ENABLE_SM2=ON")
set(VARIANT_sm_botan "")  # SM modules already in default set

# Reject unknown variant names early.
if(NOT RNPWASM_VARIANT IN_LIST RNPWASM_VARIANTS)
  message(FATAL_ERROR "Unknown variant: ${RNPWASM_VARIANT}. Pick from: ${RNPWASM_VARIANTS}")
endif()
