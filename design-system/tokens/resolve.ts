/**
 * Minimal resolver for DTCG-style token files (`$value`, `$type`, `$description`,
 * `{alias.path}` references, group-level `$type` inheritance).
 *
 * Kept free of React and of the token files themselves so it can be unit-tested
 * against fixtures and reused by build scripts.
 */

export type TokenPrimitive = string | number;
export type TokenScalar = TokenPrimitive | readonly TokenPrimitive[];
/** A primitive, a list (e.g. a font stack) or a composite such as a typography style. */
export type TokenValue = TokenScalar | { readonly [key: string]: TokenScalar };

export interface ResolvedToken {
  /** Dot path within the merged token tree, e.g. `color.text.primary`. */
  path: string;
  type: string;
  /** Value with every alias replaced by its final value. */
  value: TokenValue;
  /** The value as authored (aliases intact). */
  rawValue: TokenValue;
  /** Path of the referenced token when `rawValue` is a whole-value alias. */
  aliasOf?: string;
  description?: string;
  /** CSS custom property name, e.g. `--cd-color-text-primary`. */
  cssVariable: string;
}

export class TokenResolutionError extends Error {
  override name = 'TokenResolutionError';
}

export const CSS_VARIABLE_PREFIX = 'cd';

const ALIAS_PATTERN = /^\{([^{}]+)\}$/;

export type TokenTree = { readonly [key: string]: unknown };

interface CollectedToken {
  path: string;
  type: string | undefined;
  rawValue: TokenValue;
  description?: string;
}

function isRecord(value: unknown): value is TokenTree {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isTokenNode(value: unknown): value is TokenTree & { $value: TokenValue } {
  return isRecord(value) && '$value' in value;
}

function collect(node: TokenTree, prefix: string[], inheritedType: string | undefined, out: CollectedToken[]): void {
  const groupType = typeof node.$type === 'string' ? node.$type : inheritedType;
  for (const [key, child] of Object.entries(node)) {
    if (key.startsWith('$')) continue;
    const path = [...prefix, key];
    if (isTokenNode(child)) {
      const token: CollectedToken = {
        path: path.join('.'),
        type: typeof child.$type === 'string' ? child.$type : groupType,
        rawValue: child.$value,
      };
      if (typeof child.$description === 'string') token.description = child.$description;
      out.push(token);
    } else if (isRecord(child)) {
      collect(child, path, groupType, out);
    }
  }
}

function kebabCase(segment: string): string {
  return segment.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

/** `color.text.primary` → `--cd-color-text-primary`; camelCase segments become kebab-case. */
export function toCssVariableName(path: string, prefix = CSS_VARIABLE_PREFIX): string {
  return `--${prefix}-${path.split('.').map(kebabCase).join('-')}`;
}

export function aliasTarget(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  return ALIAS_PATTERN.exec(value)?.[1];
}

/**
 * Flattens one or more token trees and resolves aliases.
 * Throws {@link TokenResolutionError} on missing types, unknown references or cycles.
 */
export function resolveTokens(...trees: TokenTree[]): ResolvedToken[] {
  const collected: CollectedToken[] = [];
  for (const tree of trees) collect(tree, [], undefined, collected);

  const byPath = new Map<string, CollectedToken>();
  for (const token of collected) {
    if (byPath.has(token.path)) throw new TokenResolutionError(`Duplicate token path "${token.path}".`);
    byPath.set(token.path, token);
  }

  const cache = new Map<string, TokenValue>();

  const resolvePath = (path: string, stack: string[]): TokenValue => {
    const cached = cache.get(path);
    if (cached !== undefined) return cached;
    if (stack.includes(path)) {
      throw new TokenResolutionError(`Circular token reference: ${[...stack, path].join(' → ')}.`);
    }
    const token = byPath.get(path);
    if (!token) {
      const from = stack.at(-1);
      throw new TokenResolutionError(`Unknown token reference "{${path}}"${from ? ` in "${from}"` : ''}.`);
    }
    const value = resolveValue(token.rawValue, [...stack, path]);
    cache.set(path, value);
    return value;
  };

  const resolveValue = (value: TokenValue, stack: string[]): TokenValue => {
    const target = aliasTarget(value);
    if (target) return resolvePath(target, stack);
    if (Array.isArray(value)) return value as readonly TokenPrimitive[];
    if (isRecord(value)) {
      const out: Record<string, TokenScalar> = {};
      for (const [key, part] of Object.entries(value)) {
        const resolved = resolveValue(part, stack);
        if (isRecord(resolved)) {
          throw new TokenResolutionError(`Composite token "${stack.at(-1)}" property "${key}" cannot nest another composite.`);
        }
        out[key] = resolved;
      }
      return out;
    }
    return value;
  };

  return collected.map((token) => {
    if (!token.type) throw new TokenResolutionError(`Token "${token.path}" has no $type (directly or inherited).`);
    const resolved: ResolvedToken = {
      path: token.path,
      type: token.type,
      value: resolvePath(token.path, []),
      rawValue: token.rawValue,
      cssVariable: toCssVariableName(token.path),
    };
    const alias = aliasTarget(token.rawValue);
    if (alias) resolved.aliasOf = alias;
    if (token.description) resolved.description = token.description;
    return resolved;
  });
}

function quoteFontFamily(name: TokenPrimitive): string {
  const text = String(name);
  const generic = /^(serif|sans-serif|monospace|cursive|fantasy|system-ui|ui-[a-z-]+)$/;
  return generic.test(text) || !/\s/.test(text) ? text : `"${text}"`;
}

/** Serialises a primitive or list token value for CSS. Composite values are expanded by the caller. */
export function toCssValue(type: string, value: TokenValue): string {
  if (Array.isArray(value)) {
    return type === 'fontFamily' ? value.map(quoteFontFamily).join(', ') : value.join(' ');
  }
  if (isRecord(value)) {
    throw new TokenResolutionError('Composite values must be expanded before serialising to CSS.');
  }
  return String(value);
}

export interface CssDeclaration {
  name: string;
  value: string;
}

/**
 * Builds CSS custom property declarations. Aliases are emitted as `var(--…)` references
 * so a theme can override a palette value and every semantic role follows.
 */
export function toCssDeclarations(tokens: readonly ResolvedToken[]): CssDeclaration[] {
  const byPath = new Map(tokens.map((token) => [token.path, token]));
  const declarations: CssDeclaration[] = [];

  const reference = (raw: unknown, type: string, resolved: TokenValue): string => {
    const target = aliasTarget(raw);
    const referenced = target ? byPath.get(target) : undefined;
    return referenced ? `var(${referenced.cssVariable})` : toCssValue(type, resolved);
  };

  for (const token of tokens) {
    if (isRecord(token.rawValue) && isRecord(token.value)) {
      for (const [key, part] of Object.entries(token.rawValue)) {
        const resolvedPart = token.value[key];
        if (resolvedPart === undefined) continue;
        declarations.push({
          name: `${token.cssVariable}-${kebabCase(key)}`,
          value: reference(part, key === 'fontFamily' ? 'fontFamily' : token.type, resolvedPart),
        });
      }
      continue;
    }
    declarations.push({ name: token.cssVariable, value: reference(token.rawValue, token.type, token.value) });
  }
  return declarations;
}

// ---------------------------------------------------------------------------
// Colour contrast (WCAG 2.x relative luminance)
// ---------------------------------------------------------------------------

const HEX_PATTERN = /^#([0-9a-f]{6})$/i;

export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && HEX_PATTERN.test(value);
}

function relativeLuminance(hex: string): number {
  const match = HEX_PATTERN.exec(hex);
  if (!match?.[1]) throw new TokenResolutionError(`"${hex}" is not a 6-digit hex colour.`);
  const channels = [0, 2, 4].map((offset) => parseInt(match[1]!.slice(offset, offset + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)) as [
    number,
    number,
    number,
  ];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two 6-digit hex colours, from 1 to 21. */
export function contrastRatio(foreground: string, background: string): number {
  const [lighter, darker] = [relativeLuminance(foreground), relativeLuminance(background)].sort((a, b) => b - a) as [
    number,
    number,
  ];
  return (lighter + 0.05) / (darker + 0.05);
}
