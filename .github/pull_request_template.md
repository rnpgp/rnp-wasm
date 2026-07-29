## Summary

<!-- 1-3 bullet points. What changed + why. -->

## Test plan

- [ ] `npm run typecheck` passes
- [ ] `npm test` (node) passes
- [ ] `npm run test:browser` (chromium, firefox, webkit) passes
- [ ] If touching C++: build clean inside Docker with no new warnings
- [ ] If touching bindings: ran corresponding `test/node/*.test.ts`
- [ ] If touching WASM size: `npm run size:budget` passes (or baseline updated with explanation)

## Pre-merge checklist

- [ ] No commits to `main` (PR only)
- [ ] No AI attribution in commit messages, code, or docs
- [ ] No new dependencies without review
- [ ] No file deleted that I did not create
- [ ] No tag pushed (release tags are human-pushed separately)
- [ ] No hand-rolled serialization on model types
- [ ] No `double()` / mocks for rnp calls in tests
- [ ] No writes to `node_modules/` at runtime

## Security checklist (for crypto-relevant changes)

See `docs/security.md` for the full threat model. Tick the boxes relevant to this change:

- [ ] No new source file under 200 lines without tests
- [ ] No new `extern "C"` surface beyond Embind
- [ ] No file/network I/O added without explicit caller request
- [ ] No new dependencies (Botan / rnp / zlib / bzip2 / comlink only)
- [ ] No use of `eval`, `Function()`, or other dynamic-code features
- [ ] Buffer pool usage audited if allocation patterns changed
- [ ] Constant-time comparison used for any fingerprint/key equality check
- [ ] Password provider handles `null` return (abort) without crashing
- [ ] WASM sandbox integrity preserved (`-sFILESYSTEM=0`, `-sDYNAMIC_EXECUTION=0`)
- [ ] `npm audit` clean
