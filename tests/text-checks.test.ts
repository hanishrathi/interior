import { describe, expect, it } from 'vitest';
import { findConstructionReadyClaims, findImperialUnits } from '../design-system/utils/validation';

describe('findImperialUnits', () => {
  it.each([
    'Bedroom 12x10 ft',
    '12x10ft',
    "Room 10'x12'",
    "Wardrobe 6' wide",
    'Door 7′ high',
    'Door 2’6” wide',
    'A 36” vanity',
    'A 36" vanity',
    '1200 sq feet',
    '1200 sq. feet',
    '1,450 sft carpet area',
    '240 sq yd plot',
    '3 yards of fabric',
    '100 gaj plot',
    '5\'6" clear',
    '24 inch mirror',
  ])('flags %s', (text) => {
    expect(findImperialUnits(text)).not.toEqual([]);
  });

  it.each([
    'Kota "Grade 1" from the supplier',
    'size "600"',
    'Supplier code “600”',
    '2 in each bathroom',
    '900 mm clear width',
    'IP44 downlight',
    '3.96 m² floor area',
    '2700 K, 300 lux, 1.5 bar',
    'Drawing No. 12, Section 4',
    '6x6 tiles',
    "Rohan's mother",
  ])('does not flag %s', (text) => {
    expect(findImperialUnits(text)).toEqual([]);
  });
});

describe('findConstructionReadyClaims', () => {
  it.each([
    'No changes needed — layout is issued for construction.',
    'Approved without comments — issued for construction.',
    'Drawing No 12 — GFC',
    'Revised before Monday, GFC set attached',
    'G.F.C. drawings attached',
    'All GFCs issued',
    'IFC drawings',
    'Bathroom layout — for construction',
    'Issue for construction',
    'good-for-construction set',
    'Final specs',
    'Final layout',
    'the final designs',
    'This layout is construction-ready.',
  ])('flags %s', (text) => {
    expect(findConstructionReadyClaims(text)).not.toEqual([]);
  });

  it.each([
    'not issued for construction',
    'Not yet issued for construction',
    'Revise the layout before it is issued for construction.',
    'This concept is not construction-ready.',
    'Concept — not for construction',
    'Allow 12 weeks for construction.',
    'Export the IFC model for the consultant.',
    'finalise the layout next week',
    'final decision pending client approval',
    'final payment on handover',
    'final coat of paint',
    'plumbing first fix and final fix',
  ])('does not flag %s', (text) => {
    expect(findConstructionReadyClaims(text)).toEqual([]);
  });
});
