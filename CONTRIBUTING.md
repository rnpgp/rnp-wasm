# Contributing

Thanks for considering a contribution. Please read this document before opening a PR.

## Hard rules (do not violate)

1. **Never commit to `main`.** Open a PR. Always.
2. **Never push git tags from automation.** Tags are release points; they are human-pushed.
3. **Never add AI attribution** to commit messages, code, or docs. No `Co-authored-by:`, no `Generated with`, no AI emoji.
4. **Never delete files you did not create.** Source files are sacred. Flag unwanted files in an issue instead.
5. **Never use `double()` / mocks for rnp calls in tests.** Real rnp, real fixtures.
6. **Never hand-roll serialization.** Use rnp's `*_to_json` / `*_from_json` and pass strings/JSON through.
7. **Never write to `node_modules/`** or any path under the package install location at runtime.

## Setup

```sh
git clone --recurse-submodules <repo-url>
cd rnp-wasm
scripts/build.sh --docker    # produces dist/
npm ci
npm test                     # node tests
npm run test:browser         # playwright (chromium, firefox, webkit)
```

For interactive debugging inside the container:

```sh
scripts/dev-shell.sh
```

## Branches

- `main` — protected. Direct pushes forbidden.
- Feature branches: `feat/<short-description>`.
- Bug fix branches: `fix/<short-description>`.
- rnp bumps: `bump-rnp-v<X.Y.Z>`.

## Commit messages

Conventional Commits style:

```
feat(operations): add detached signature support
fix(bindings): correctly handle empty UID data
docs(api): clarify password provider semantics
chore(deps): bump botan 3.5.0 → 3.5.1
```

Body (optional) explains the **why**, not the what. No AI trailers.

## Code style

- TypeScript: strict mode (`tsconfig.json`). ESLint config in `.eslintrc.cjs`.
- C++: C++17, `-Wall -Wextra -Wpedantic`. RAII everywhere (see `handle.h`).
- 2-space indent for TS, 4-space for C++. `.editorconfig` enforces both.

## Architecture

Each module has one responsibility (MECE). Adding a new algorithm: register it in `ts/registry/algorithm.ts`. Adding a new rnp API surface: add `src/cpp/bindings/<name>.cpp` with its own `EMSCRIPTEN_BINDINGS` block and a corresponding `ts/<name>.ts` wrapper. Do not modify existing files unless fixing a bug.

See `docs/architecture.md` for the full layering.

## Tests

- **Node tests** in `test/node/*.test.ts`. Run via `npm test`.
- **Browser tests** in `test/browser/`. Run via `npm run test:browser`.
- **Fixtures** in `test/fixtures/`. Real OpenPGP material only.
- **RFC vectors** in `test/fixtures/vectors/`. Pulled from `openpgp-wg/vectors`.

Each PR must keep all tests green. New functionality must ship with tests.

## Review

- Small PRs preferred (< 400 LOC excluding tests).
- One concern per PR.
- Self-review the diff before requesting review.

## License

By contributing you agree your contributions are licensed under the project's BSD-2-Clause license (see `LICENSE`).
