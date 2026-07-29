#!/usr/bin/env python3
"""
scripts/gen-module-types.py

Generates ts/module-types.ts from the Embind registrations in
src/cpp/bindings/*.cpp. Single source of truth: the C++ bindings ARE the
interface; this script reflects them into TypeScript.

Why: previously module-types.ts was hand-maintained as a ~260-line mirror
of every Embind class. Drift was inevitable (sign.cpp registered
rnpSignExecute free function that never appeared in module-types.ts;
setKeyProvider type silently agreed with a no-op callback).

The generator parses:
  - class_<X>("Name")            → interface Name
  - class_<X, base<Y>>("Name")   → interface Name extends Y
  - .function("m", &X::method)   → method on the interface
  - .class_function("m", &X::sm")→ static method
  - function("m", &freeFn)       → top-level function

Method signatures are inferred by looking up the C++ method declaration
in the same .cpp file or the matching .hpp header. Type mapping:
  void        → void
  bool        → boolean
  uint32_t, int32_t, size_t, double  → number
  uint64_t    → number   (fits in double precision for rnp's ranges)
  std::string, const std::string&  → string
  emscripten::val  → any
  T*          → T   (raw pointers handled per-context)

Unknown types fall back to `any` with a // TODO comment.

Run: python3 scripts/gen-module-types.py
Output: ts/module-types.ts (overwritten in place)
"""

from __future__ import annotations

import re
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

REPO_ROOT = Path(__file__).resolve().parent.parent
BINDINGS_DIR = REPO_ROOT / "src" / "cpp" / "bindings"
OUTPUT_FILE = REPO_ROOT / "ts" / "module-types.ts"

# C++ allows these as identifiers; TypeScript reserves them. Rename when
# emitting param names.
TS_RESERVED = {"in", "out", "as", "of", "from", "let", "const", "var", "for", "do", "if", "else"}

# Modifiers that may appear before a return type and should be stripped.
CPP_MODIFIERS = {"static", "inline", "constexpr", "virtual", "explicit", "noexcept",
                 "override", "final", "const", "volatile", "mutable"}


def strip_modifiers(cpp: str) -> str:
    """Strip C++ modifiers (static, inline, etc.) and surrounding whitespace."""
    tokens = cpp.split()
    out = [t for t in tokens if t not in CPP_MODIFIERS]
    return " ".join(out).strip()


def sanitize_param_name(name: str) -> str:
    return f"_{name}" if name in TS_RESERVED else name

TYPE_MAP = {
    "void": "void",
    "bool": "boolean",
    "uint8_t": "number",
    "uint16_t": "number",
    "uint32_t": "number",
    "int32_t": "number",
    "int": "number",
    "size_t": "number",
    "double": "number",
    "float": "number",
    "uint64_t": "number",
    "int64_t": "number",
    "std::string": "string",
    "uintptr_t": "number",
}


@dataclass
class Param:
    name: str
    cpp_type: str


@dataclass
class Method:
    name: str
    params: list[Param] = field(default_factory=list)
    return_cpp: str = "void"
    is_static: bool = False
    has_return_value_policy: bool = False


@dataclass
class FreeFunction:
    name: str
    params: list[Param] = field(default_factory=list)
    return_cpp: str = "void"


@dataclass
class Class:
    embind_name: str
    cpp_name: str
    base_embind: Optional[str] = None
    methods: list[Method] = field(default_factory=list)


def map_cpp_type(cpp: str, known_classes: dict[str, str] | None = None) -> str:
    """Map a C++ type to TypeScript. known_classes maps cpp class name →
    embind TS interface name (e.g. {"FfiHandle": "RnpFfiHandle"})."""
    cpp = cpp.strip()
    # Detect raw pointer BEFORE stripping it. Pointers can be null at the JS
    # boundary (Embind accepts null for T* params).
    is_nullable = "*" in cpp
    cpp = cpp.replace("const ", "").replace("&", "").replace("*", "").strip()
    if cpp in TYPE_MAP:
        return TYPE_MAP[cpp]
    if cpp.startswith("std::function"):
        return "(...args: unknown[]) => unknown";
    if cpp.startswith("emscripten::val"):
        return "unknown";
    # std::unique_ptr<T, Deleter> → T  (Embind surfaces these as JS instances of T)
    m = re.match(r"std::unique_ptr<\s*([\w:]+)", cpp)
    if m:
        inner = m.group(1)
        return known_classes.get(inner, "unknown") if known_classes else "unknown"
    if known_classes and cpp in known_classes:
        return known_classes[cpp] + (" | null" if is_nullable else "")
    # Class types we don't know about — fall back to unknown.
    return "unknown"


def find_method_signature(cpp_name: str, method_name: str, file_text: str, all_headers: dict[str, str]) -> tuple[list[Param], str]:
    """Find the C++ method declaration to extract param types and return type.

    Strategy: most methods in this codebase are inline members defined inside
    the class body in the .cpp file OR in a .hpp header. Pattern inside class
    body: <ret> methodName(args). Fallback: out-of-line definition
    <ret> ClassName::methodName(args).
    """
    # Concatenated headers — lookups shouldn't depend on file-stem matching
    # class-name.
    headers_text = all_headers.get("*", "")
    # Strategy 1: inline member inside the class body (try .cpp first, then headers)
    class_pattern = re.compile(r"class\s+" + re.escape(cpp_name) + r"\b[^{]*\{", re.DOTALL)
    for source in [file_text, headers_text]:
        cls_match = class_pattern.search(source)
        if cls_match:
            body_start = cls_match.end()
            depth = 1
            i = body_start
            while i < len(source) and depth > 0:
                if source[i] == "{":
                    depth += 1
                elif source[i] == "}":
                    depth -= 1
                i += 1
            body = source[body_start:i]
            # Anchor the return-type capture at start-of-line or after a
            # statement separator. Without this, the greedy regex picks up
            # preceding comment text like `// Identity\n  std::string`.
            method_pattern = re.compile(
                r"(?:^|;|\{)\s*([\w:<>,\s\*&]+?)\s+" + re.escape(method_name) + r"\s*\(([^)]*)\)",
                re.MULTILINE,
            )
            m = method_pattern.search(body)
            if m:
                return parse_params(m.group(2)), strip_modifiers(m.group(1))

    # Strategy 2: out-of-line definition: <ret> ClassName::methodName(args)
    pattern = re.compile(
        r"([\w:<>,\s\*&]+?)\s+" + re.escape(cpp_name) + r"::" + re.escape(method_name) + r"\s*\(([^)]*)\)"
    )
    for source in [file_text, headers_text]:
        match = pattern.search(source)
        if match:
            return parse_params(match.group(2)), strip_modifiers(match.group(1))

    return [], "void"


def parse_params(args_str: str) -> list[Param]:
    """Parse C++ parameter list into Param objects."""
    args_str = args_str.strip()
    if not args_str or args_str == "void":
        return []
    params = []
    for arg in split_args(args_str):
        arg = arg.strip()
        if not arg:
            continue
        # Last identifier is the param name; everything before is the type.
        # Special-case: "const std::string& foo", "uint32_t foo", etc.
        m = re.match(r"^(.*?)\s*(\w+)$", arg)
        if not m:
            continue
        type_part = strip_modifiers(m.group(1))
        name = m.group(2)
        # Strip default values
        if "=" in type_part:
            type_part = type_part.split("=", 1)[0].strip()
        params.append(Param(name=name, cpp_type=type_part))
    return params


def split_args(args_str: str) -> list[str]:
    """Split on commas, respecting template brackets."""
    out = []
    depth = 0
    cur = []
    for c in args_str:
        if c in "<(":
            depth += 1
        elif c in ">)":
            depth -= 1
        if c == "," and depth == 0:
            out.append("".join(cur))
            cur = []
        else:
            cur.append(c)
    if cur:
        out.append("".join(cur))
    return out


def parse_binding_file(path: Path, all_headers: dict[str, str]) -> tuple[list[Class], list[FreeFunction]]:
    text = path.read_text()
    classes: dict[str, Class] = {}
    free_funcs: list[FreeFunction] = []

    # Match class_<X>("Name") optionally with base<Y>
    # Note: the closing `>` after X must be consumed before the opening `(`.
    for m in re.finditer(
        r'class_<\s*([\w:]+?)\s*(?:,\s*base<\s*(\w+)\s*>\s*)?\s*>\s*\(\s*"(\w+)"\s*\)',
        text,
    ):
        cpp_name, base_cpp, embind_name = m.group(1), m.group(2), m.group(3)
        base_embind = CPP_NAME_TO_EMBIND.get(base_cpp) if base_cpp else None
        classes[embind_name] = Class(
            embind_name=embind_name,
            cpp_name=cpp_name,
            base_embind=base_embind,
        )

    # Match .function("m", &Class::method, ...) — Embind name and C++ method
    # name can differ (e.g. .function("primaryFingerprint", &KeyHandle::primaryFprint)
    # or .function("export", &KeyHandle::export_)).
    for embind_name, cls in classes.items():
        cpp_name = cls.cpp_name
        for m in re.finditer(
            r'\.function\(\s*"(\w+)"\s*,\s*&' + re.escape(cpp_name) + r"::(\w+)",
            text,
        ):
            method_embind = m.group(1)
            cpp_method = m.group(2)
            params, ret = find_method_signature(cpp_name, cpp_method, text, all_headers)
            cls.methods.append(Method(name=method_embind, params=params, return_cpp=ret))

        # Static class functions
        for m in re.finditer(
            r'\.class_function\(\s*"(\w+)"\s*,\s*&' + re.escape(cpp_name) + r"::(\w+)",
            text,
        ):
            method_embind = m.group(1)
            cpp_method = m.group(2)
            params, ret = find_method_signature(cpp_name, cpp_method, text, all_headers)
            cls.methods.append(Method(name=method_embind, params=params, return_cpp=ret, is_static=True))

    # Free functions: function("name", &freeFn, ...) or emscripten::function(...)
    # Must NOT match `.function("name", &Class::method)` inside a class_<>
    # registration. Anchor on start-of-statement (^ or ; or {) to exclude
    # member-function calls. Accept optional `emscripten::` prefix.
    for m in re.finditer(
        r'(?:^|[;{])\s*(?:emscripten::)?function\(\s*"(\w+)"\s*,\s*&([\w:]+)',
        text, re.MULTILINE,
    ):
        name = m.group(1)
        cpp_fn = m.group(2)
        # Skip if it's actually a member function reference (Class::method)
        if "::" in cpp_fn:
            continue
        # Find declaration
        sig_pattern = re.compile(r"(?:[\w:<>,\s\*&]+?)\s+" + re.escape(cpp_fn) + r"\s*\(([^)]*)\)")
        match = sig_pattern.search(text)
        if match:
            args_str = match.group(1)
            full = re.search(r"([\w:<>,\s\*&]+?)\s+" + re.escape(cpp_fn) + r"\s*\(", text)
            ret = strip_modifiers(full.group(1)) if full else "void"
            params = parse_params(args_str)
        else:
            params, ret = [], "void"
        free_funcs.append(FreeFunction(name=name, params=params, return_cpp=ret))

    return list(classes.values()), free_funcs


# Populated after first pass — maps CPP_NAME → EMBIND_NAME for base class resolution.
CPP_NAME_TO_EMBIND: dict[str, str] = {}


def render_param(p: Param, known_classes: dict[str, str] | None = None) -> str:
    return f"{sanitize_param_name(p.name)}: {map_cpp_type(p.cpp_type, known_classes)}"


def render_method(m: Method, known_classes: dict[str, str] | None = None) -> str:
    params = ", ".join(render_param(p, known_classes) for p in m.params)
    ret = map_cpp_type(m.return_cpp, known_classes)
    # No `static` prefix — TypeScript interfaces don't allow it. Static
    # methods are routed to the Constructor companion interface, where they
    # appear as regular members of the constructor object type.
    return f"  {m.name}({params}): {ret};"


def render_class(c: Class, known_classes: dict[str, str]) -> str:
    extends = f" extends {c.base_embind}" if c.base_embind else ""
    lines = [f"export interface {c.embind_name}{extends} {{"]
    for m in c.methods:
        if not m.is_static:
            lines.append(render_method(m, known_classes))
    # Embind classes always get _destroy via the registration; ensure it's present.
    if not any(m.name == "_destroy" for m in c.methods):
        lines.append("  _destroy(): void;")
    lines.append("}")

    # Static interface: Embind exposes class_function as properties on the
    # constructor object (module.RnpFooHandle.create(...) etc.). Emit a
    # companion interface with `static` members that the typeof operator
    # picks up when RnpModule references it.
    static_methods = [m for m in c.methods if m.is_static]
    if static_methods or True:  # always emit so typeof works
        lines.append("")
        lines.append(f"export interface {c.embind_name}Constructor {{")
        for m in static_methods:
            lines.append(render_method(m, known_classes))
        lines.append("}")

    return "\n".join(lines)


def render_free_function(f: FreeFunction, known_classes: dict[str, str]) -> str:
    params = ", ".join(render_param(p, known_classes) for p in f.params)
    ret = map_cpp_type(f.return_cpp, known_classes)
    return f"  {f.name}({params}): {ret};"


def main() -> int:
    binding_files = sorted(BINDINGS_DIR.glob("*.cpp"))
    # Collect headers for cross-file signature lookup. Strategy 2 in
    # find_method_signature needs the .hpp content too (methods are often
    # declared there). Concatenate all .hpp text so lookups don't depend
    # on file-stem matching class-name.
    all_headers: dict[str, str] = {}
    combined_headers = ""
    for hpp in BINDINGS_DIR.glob("*.hpp"):
        text = hpp.read_text()
        all_headers[hpp.stem] = text
        combined_headers += text + "\n"
    all_headers["*"] = combined_headers

    all_classes: list[Class] = []
    all_free: list[FreeFunction] = []

    # Two-pass: first collect class CPP→EMBIND mapping, then parse methods.
    for bf in binding_files:
        text = bf.read_text()
        for m in re.finditer(
            r'class_<\s*([\w:]+?)\s*(?:,\s*base<\s*\w+\s*>\s*)?\s*>\s*\(\s*"(\w+)"\s*\)',
            text,
        ):
            CPP_NAME_TO_EMBIND[m.group(1)] = m.group(2)

    for bf in binding_files:
        classes, free = parse_binding_file(bf, all_headers)
        all_classes.extend(classes)
        all_free.extend(free)

    # Emit TS
    out = [
        "/* eslint-disable @typescript-eslint/no-empty-object-type --",
        "   auto-generated; empty Constructor interfaces are intentional for",
        "   classes that have no class_function registrations. */",
        "// ⚠️ AUTO-GENERATED by scripts/gen-module-types.py.",
        "// Do not edit by hand. Re-run after changing src/cpp/bindings/*.cpp.",
        "//",
        "// Mirrors every Embind class_<X>('Name') registration and every",
        "// .function('m', &X::method) call into a TypeScript interface so the",
        "// TS wrapper (ts/*.ts) can call into WASM with type safety.",
        "",
        "// Emscripten runtime symbols that aren't Embind-registered but are",
        "// always present on the loaded module. EXPORTED_RUNTIME_METHODS in",
        "// cmake/Emscripten.cmake controls which of these are exposed.",
        "export interface EmscriptenRuntime {",
        "  HEAPU8: Uint8Array;",
        "  HEAPU32: Uint32Array;",
        "  HEAP8: Int8Array;",
        "  _malloc(bytes: number): number;",
        "  _free(ptr: number): void;",
        "  UTF8ToString(ptr: number): string;",
        "  stringToUTF8(str: string, ptr: number, maxBytes: number): number;",
        "  lengthBytesUTF8(str: string): number;",
        "  ccall(name: string, ...args: unknown[]): unknown;",
        "  cwrap(name: string, ...args: unknown[]): (...args: unknown[]) => unknown;",
        "  addFunction(fn: (...args: unknown[]) => unknown, sig?: string): number;",
        "  removeFunction(ptr: number): void;",
        "  getExceptionMessage(ptr: number): string;",
        "}",
        "",
        "// Free-function declarations on the loaded module.",
        "export interface RnpModule extends EmscriptenRuntime {",
    ]
    # Free functions belong on RnpModule.
    seen = set()
    for f in all_free:
        if f.name in seen:
            continue
        seen.add(f.name)
        out.append(render_free_function(f, CPP_NAME_TO_EMBIND))
    # Each Embind class is also accessible as `module.RnpFooHandle` at runtime
    # (that's how class_function/static methods are reached). Declare them
    # as properties typed by the companion Constructor interface.
    seen_cls = set()
    for c in sorted(all_classes, key=lambda x: x.embind_name):
        if c.embind_name in seen_cls:
            continue
        seen_cls.add(c.embind_name)
        out.append(f"  {c.embind_name}: {c.embind_name}Constructor;")
    out.append("}")

    # Class interfaces (sorted by name for deterministic output).
    seen_cls = set()
    for c in sorted(all_classes, key=lambda x: x.embind_name):
        if c.embind_name in seen_cls:
            continue
        seen_cls.add(c.embind_name)
        out.append("")
        out.append(render_class(c, CPP_NAME_TO_EMBIND))

    # Manual overrides for cases the codegen can't infer from C++ signatures.
    # Keep this list short and explain WHY each override is needed.
    out.append("")
    out.append("// ---- Manual overrides -------------------------------------------")
    out.append("// The codegen above reflects C++ signatures verbatim. A handful of")
    out.append("// methods return emscripten::val that we KNOW will be a specific JS")
    out.append("// type at runtime (e.g. Uint8Array for OutputHandle.bytes()). Patch")
    out.append("// those here so consumers don't have to cast.")
    out.append("")
    out.append("export interface RnpOutputHandle {")
    out.append("  bytes(): Uint8Array;")
    out.append("}")

    out.append("")
    OUTPUT_FILE.write_text("\n".join(out))
    print(f"==> wrote {OUTPUT_FILE.relative_to(REPO_ROOT)} ({len(all_classes)} classes, {len(seen)} free functions)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
