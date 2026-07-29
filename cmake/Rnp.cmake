# cmake/Rnp.cmake
# Not a find module — we built rnp ourselves (scripts/build-rnp.sh).
# This file exists only to document the imported-target contract used at the
# top-level CMakeLists.txt and to provide a single point for changing paths
# if the build layout ever changes.

# Imported target: rnp_static
#   IMPORTED_LOCATION       = ${RNP_LIB_DIR}/librnp.a
#   INTERFACE_INCLUDE_DIRS  = ${RNP_INCLUDE_DIR}
#
# Lib layout (librnp.a):
#   lib/librnp.a            — rnp itself
# Lib layout (libsexpp, bundled by rnp build):
#   lib/libsexpp.a          — S-expression library (linked transitively)
#
# If librnp.a ever stops bundling libsexpp, add it as a separate imported lib.
