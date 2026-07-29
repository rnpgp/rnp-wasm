/**
 * ts/disposable.ts
 *
 * @deprecated Use `Handle` directly. The class already implements the TC39
 * explicit-resource-management protocol via `[Symbol.dispose]`. This file is
 * kept as an empty stub to avoid breaking imports; new code should not
 * reference `Disposable` or `destroy`.
 *
 * Removed in audit round (2026-07-28): the exports here were unused after
 * `Handle[Symbol.dispose]` was added. The file itself is preserved per the
 * project's "source files are sacred" rule.
 */
