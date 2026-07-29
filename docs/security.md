# Security

rnp-wasm is a thin binding layer over rnp, Botan, zlib, and bzip2. Cryptographic correctness is **inherited** from those upstreams. The security surface we own is narrower.

## Threat model

In scope:
- **Binding correctness.** Lifetime of opaque handles, error propagation, byte-array ownership across the JS↔WASM boundary.
- **Memory safety.** The WASM sandbox isolates rnp from the host; we ensure no escape via filesystem or eval.
- **Reproducibility.** Pinned toolchain + deps so the published `.wasm` matches the audited source.

Out of scope (consumer's responsibility):
- **Key storage.** Where you keep secret keys, how you protect them at rest.
- **Passphrase transport.** How the password reaches `unlock()` or `setPasswordProvider()`.
- **Browser side-channels.** Browsers expose timing and cache side-channels by design; rnp-wasm cannot defend against them.

Out of scope (inherited from upstream):
- **Crypto correctness** of rnp and Botan.
- **Side-channel resistance** of the underlying implementations. Botan is not constant-time across all algorithms; consumers requiring side-channel resistance must choose algorithms accordingly.

## RNG

Entropy is sourced from `crypto.getRandomValues` in browsers and Node's `webcrypto` in Node. This is bridged into Botan via `__syscall_getrandom` (see `src/cpp/shim_entropy.cpp`). The shim is exercised by the lifecycle test.

## Filesystem

The build disables Emscripten's filesystem (`-sFILESYSTEM=0`). All rnp I/O is forced through memory-backed `Input` and `Output` wrappers. There is no path-based API surface to accidentally expose.

## Dynamic code

`-sDYNAMIC_EXECUTION=0` disables `eval` and `new Function` inside the WASM module. No rnp code path constructs dynamic code.

## Audit checklist (per release)

- [ ] No new source file under 200 lines without tests
- [ ] No new `extern "C"` surface beyond Embind
- [ ] No file/network I/O added without explicit caller request
- [ ] No new dependencies (Botan / rnp / zlib / bzip2 only)
- [ ] Buffer pool usage audited if allocation patterns changed
- [ ] `npm audit` clean
- [ ] WASM sandbox integrity verified (`-sFILESYSTEM=0`, `-sDYNAMIC_EXECUTION=0`)
- [ ] No file deleted without explicit user approval

## Reporting a vulnerability

Email the maintainers privately, or open a private security advisory via GitHub's "Report a vulnerability" feature on the Security tab. Please **do not** open a public issue for security problems.

## Response time

- Acknowledgement within 72 hours.
- Initial assessment within 7 days.
- Fix or mitigation within 30 days for high-severity issues, 90 days for low.

## Supported versions

Only the latest minor release line receives security fixes. Old versions are EOL upon the next minor.

## Disclosure

Coordinated disclosure after a fix is released, with credit to the reporter unless they prefer anonymity.
