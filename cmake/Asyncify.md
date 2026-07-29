# Asyncify build flags

See [TODO 37](../TODO.complete/37-asyncify.md).

This file documents where Asyncify is wired and the budget impact.

## Where it's set

`cmake/Emscripten.cmake` includes `-sASYNCIFY=1` by default (controlled by
`RNPWASM_ASYNCIFY_DEFAULT`). The function whitelist lives in
`RNPWASM_ASYNCIFY_ONLY` (keep small).

## What depends on it

- `src/cpp/trampoline.h` — the password callback trampoline calls back into
  JS via `emscripten::val`. The JS function may be async (return a Promise);
  Asyncify suspends the C call stack while the promise resolves.

- The public `execute()` methods on operation handles are listed in
  `RNPWASM_ASYNCIFY_ONLY` so future enhancements (yielding to the event loop
  mid-operation for responsiveness) can be added without a rebuild.

## Size impact

Typical delta: +5–15% on `dist/rnp.wasm`. The size budget workflow (TODO 34)
flags any growth beyond 5% for review.

## Disabling

To produce a non-Asyncify build (smaller `.wasm`, but provider callbacks must
return synchronously):

```sh
cmake -DRNPWASM_ASYNCIFY_DEFAULT=OFF ...
```

Or in scripts:

```sh
ASYNCIFY=OFF scripts/build.sh --variant default
```

(v1 does not expose this via `scripts/build.sh` flags; if needed, add a
`--no-asyncify` switch in TODO 37 follow-up.)
