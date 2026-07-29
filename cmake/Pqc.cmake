# cmake/Pqc.cmake
# Post-quantum variant configuration. See TODO 40.
#
# When RNPWASM_VARIANT=pqc, the rnp build is configured with ENABLE_PQC=ON
# and the Botan build is configured with the PQC modules added to its
# BOTAN_MODULES list. scripts/build-deps.sh reads cmake/Variants.cmake.

# Documentation only — actual variant switch happens in:
#   - cmake/Variants.cmake (rnp cache vars per variant)
#   - scripts/build-deps.sh (BOTAN_MODULES per variant)
#
# PQC algorithm registration in TS layer lives in:
#   - ts/registry/algorithm.ts  (registered conditionally based on
#     rnp.supportsFeature("asymmetric", "ML-KEM-768") etc. — see test/node/registry.test.ts)

# When upgrading Botan or rnp PQC API, also bump:
#   - Dockerfile BOTAN_VERSION
#   - cmake/Variants.cmake VARIANT_pqc_botan list
