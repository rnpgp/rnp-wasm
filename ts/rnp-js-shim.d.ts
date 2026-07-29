/**
 * ts/rnp-js-shim.d.ts
 * Ambient type shim for the Emscripten-generated module.
 *
 * The actual dist/rnp.js is produced by the build (Emscripten EXPORT_ES6=1)
 * and has no .d.ts. We declare the default export via a wildcard so dynamic
 * imports from any relative path typecheck cleanly. Type-only — emits no
 * JavaScript.
 *
 * We use a leading-wildcard pattern ("*rnp.js") rather than the literal
 * relative path because TypeScript matches module-augmentation against the
 * resolved file when the file exists, which would still fail with allowJs:false.
 * Wildcards bypass that resolution.
 */

type RnpFactory = (opts: Record<string, unknown>) => Promise<unknown>;

declare module "*rnp.js" {
  const factory: RnpFactory;
  export default factory;
}
