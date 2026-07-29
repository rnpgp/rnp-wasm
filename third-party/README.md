# third-party/

Vendored upstream sources used by the rnp-wasm build.

## `rnp/` (git submodule)

- **Source:** https://github.com/rnpgp/rnp
- **Pinned at:** `v0.18.1`
- **License:** BSD-2-Clause (see `rnp/LICENSE.md` after checkout)

### Initialize

```sh
git submodule update --init --recursive
```

### Bump

```sh
# Create a branch first; never commit to main.
git checkout -b bump-rnp-v<NEW>
cd third-party/rnp
git fetch origin
git checkout v<NEW>
cd ../..
git add third-party/rnp
# Rebuild (scripts/build.sh) and run tests before committing.
```

### Patch policy

Patches are a **last resort**. If rnp needs a fix to build under Emscripten:

1. File an upstream issue or PR first.
2. Add the patch as `third-party/patches/<NN>-<short-description>.patch`.
3. Document the upstream issue URL in the patch header.
4. `scripts/build-rnp.sh` auto-applies patches found in that directory.

Currently no patches are applied.
