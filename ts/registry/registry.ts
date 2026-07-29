/**
 * ts/registry/registry.ts
 * Generic name → value registry. Case-insensitive lookup with optional aliases.
 * Used by AlgorithmRegistry and FeatureRegistry to satisfy OCP: new algorithms
 * are registered, not switch-cased.
 */

/**
 * Generic registry mapping names to values. Lookup is case-insensitive and
 * supports optional aliases. The registry is the foundation of the OCP
 * pattern in rnp-wasm: callers validate inputs against a registry rather
 * than switch statements that would need editing per new entry.
 *
 * @example
 * ```ts
 * const r = new Registry<string>();
 * r.register("AES-256", "AES-256", ["aes256", "AES256"]);
 * r.lookup("aes256");      // "AES-256"
 * r.lookup("AES256");      // "AES-256"
 * r.has("AES-256");        // true
 * ```
 */
export class Registry<T> {
  private readonly values = new Map<string, T>();
  private readonly aliases = new Map<string, string>();

  /**
   * Registers a value under the given name (case-insensitive) and optional
   * aliases. Aliases also resolve case-insensitively.
   *
   * @param name    Canonical name.
   * @param value   Value to store.
   * @param aliases Alternate spellings callers may use to look this up.
   * @throws Error on duplicate name or alias collision.
   */
  register(name: string, value: T, aliases: readonly string[] = []): void {
    const key = name.toLowerCase();
    if (this.values.has(key)) {
      throw new Error(`Registry: duplicate name '${name}'`);
    }
    this.values.set(key, value);
    const seen = new Set<string>([key]);
    for (const alias of aliases) {
      const aliasKey = alias.toLowerCase();
      // Silently skip self-collision (alias == canonical) and intra-call
      // duplicates (same alias listed twice). These are harmless.
      if (seen.has(aliasKey)) continue;
      seen.add(aliasKey);
      if (this.aliases.has(aliasKey) || this.values.has(aliasKey)) {
        throw new Error(`Registry: alias '${alias}' for '${name}' collides with existing entry`);
      }
      this.aliases.set(aliasKey, key);
    }
  }

  /**
   * Looks up a value by name or alias (case-insensitive).
   *
   * @param name Name or alias.
   * @returns The registered value.
   * @throws Error if the name is unknown.
   */
  lookup(name: string): T {
    const key = (this.aliases.get(name.toLowerCase()) ?? name.toLowerCase());
    const v = this.values.get(key);
    if (v === undefined) {
      throw new Error(`Registry: unknown name '${name}'`);
    }
    return v;
  }

  /**
   * Returns true if the name (or alias) is registered. Does not throw.
   *
   * @param name Name or alias.
   */
  has(name: string): boolean {
    const key = (this.aliases.get(name.toLowerCase()) ?? name.toLowerCase());
    return this.values.has(key);
  }

  /**
   * Returns all canonical registered names (lowercased). Aliases excluded.
   */
  names(): readonly string[] {
    return Array.from(this.values.keys());
  }
}
