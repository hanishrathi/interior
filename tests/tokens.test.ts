import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  MATERIAL_CATEGORIES,
  TokenResolutionError,
  auditContrast,
  buildTokenCss,
  contrastRatio,
  cssVar,
  designTokens,
  finishTokens,
  getToken,
  getTokensByPrefix,
  isHexColor,
  lightingTokens,
  materialTokens,
  planningGuidance,
  resolveTokens,
  toCssVariableName,
} from '../design-system/tokens';

describe('token resolution', () => {
  it('resolves every visual token with a type', () => {
    expect(designTokens.length).toBeGreaterThan(100);
    for (const token of designTokens) expect(token.type, token.path).toBeTruthy();
  });

  it('gives every token a unique CSS custom property', () => {
    const names = designTokens.map((token) => token.cssVariable);
    expect(new Set(names).size).toBe(names.length);
  });

  it('resolves semantic colours through palette aliases', () => {
    const text = getToken('color.text.primary');
    expect(text.aliasOf).toBe('palette.stone.900');
    expect(text.value).toBe('#1F1D1A');
  });

  it('keeps every colour token a hex value or an rgba() overlay', () => {
    for (const token of getTokensByPrefix('color').concat(getTokensByPrefix('palette'))) {
      const value = typeof token.value === 'string' ? token.value : '';
      expect(isHexColor(value) || /^rgba\(/.test(value), token.path).toBe(true);
    }
  });

  it('inherits $type from groups', () => {
    const [token] = resolveTokens({ group: { $type: 'dimension', gap: { $value: '1rem' } } });
    expect(token?.type).toBe('dimension');
  });

  it('rejects circular references', () => {
    expect(() =>
      resolveTokens({ a: { $type: 'color', $value: '{b}' }, b: { $type: 'color', $value: '{a}' } }),
    ).toThrow(TokenResolutionError);
  });

  it('rejects unknown references', () => {
    expect(() => resolveTokens({ a: { $type: 'color', $value: '{missing.token}' } })).toThrow(/Unknown token reference/);
  });

  it('rejects tokens without a type', () => {
    expect(() => resolveTokens({ a: { $value: '1rem' } })).toThrow(/no \$type/);
  });

  it('builds CSS variable names and references', () => {
    expect(toCssVariableName('color.action.primaryHover')).toBe('--cd-color-action-primary-hover');
    expect(cssVar('space.4')).toBe('var(--cd-space-4)');
    expect(() => cssVar('space.nonexistent')).toThrow();
  });
});

describe('contrast', () => {
  it('meets WCAG 2.2 AA for every declared pair', () => {
    const failures = auditContrast()
      .filter((result) => !result.passes)
      .map((result) => `${result.foreground} on ${result.background}: ${result.ratio.toFixed(2)}`);
    expect(failures).toEqual([]);
  });

  it('computes reference ratios', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1);
    expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBe(1);
  });
});

describe('generated CSS', () => {
  const css = buildTokenCss();

  it('matches the committed tokens.css', () => {
    const committed = readFileSync(new URL('../design-system/styles/tokens.css', import.meta.url), 'utf8');
    expect(committed).toBe(css);
  });

  it('emits aliases as var() references so themes can override the palette', () => {
    expect(css).toContain('--cd-color-text-primary: var(--cd-palette-stone-900);');
  });

  it('expands composite typography tokens', () => {
    expect(css).toContain('--cd-text-style-body-font-size: var(--cd-font-size-md);');
    expect(css).toContain('--cd-text-style-heading1-font-family: var(--cd-font-family-display);');
  });

  it('quotes multi-word font families', () => {
    expect(css).toContain('--cd-font-family-sans: "Instrument Sans", "Helvetica Neue", Arial, system-ui, sans-serif;');
  });
});

describe('domain tokens', () => {
  it('keeps planning guidance metric and internally consistent', () => {
    expect(planningGuidance.unit).toBe('mm');
    for (const [key, clearance] of Object.entries(planningGuidance.clearances)) {
      expect(clearance.minimum, key).toBeLessThanOrEqual(clearance.recommended);
    }
    for (const [key, height] of Object.entries(planningGuidance.heights)) {
      expect(height.range[0], key).toBeLessThanOrEqual(height.typical);
      expect(height.typical, key).toBeLessThanOrEqual(height.range[1]);
    }
  });

  it('defines every material category with a unique code prefix', () => {
    expect(Object.keys(materialTokens.categories).sort()).toEqual([...MATERIAL_CATEGORIES].sort());
    const prefixes = Object.values(materialTokens.categories).map((category) => category.codePrefix);
    expect(new Set(prefixes).size).toBe(prefixes.length);
  });

  it('only pairs reference materials with finishes that apply to them', () => {
    for (const reference of materialTokens.references) {
      for (const finishId of reference.commonFinishes) {
        expect(finishTokens[finishId]?.appliesTo, `${reference.id} → ${finishId}`).toContain(reference.category);
      }
    }
  });

  it('flags glossy finishes as unsuitable for wet floors', () => {
    expect(finishTokens['stone-polished']?.wetFloorGuidance).toBe('avoid');
    expect(finishTokens['tile-glossy']?.wetFloorGuidance).toBe('avoid');
  });

  it('defines minimum IP ratings for bathroom zones', () => {
    expect(lightingTokens.bathroomZones['zone-0'].minimumIp).toBe('IPX7');
    expect(lightingTokens.bathroomZones['zone-1'].minimumIp).toBe('IPX4');
    expect(lightingTokens.bathroomZones['outside-zones'].minimumIp).toBeNull();
  });
});
