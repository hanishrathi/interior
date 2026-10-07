import { describe, expect, it } from 'vitest';
import type { Material } from '../design-system/schemas/material';
import type { Room } from '../design-system/schemas/room';
import { auditDesign, phaseBand, scoreFindings, type DesignAuditInput } from '../design-system/utils/designQualityAudit';
import { findConstructionReadyClaims, findImperialUnits } from '../design-system/utils/validation';
import { clone, confirmed, sample } from './fixtures';

const AS_OF = '2026-10-05';

const baseInput = (): DesignAuditInput => ({
  project: clone(sample.project),
  client: clone(sample.client),
  rooms: [clone(sample.bathroom)],
  products: clone(sample.products),
  materials: clone(sample.materials),
  asOf: AS_OF,
});

const rules = (input: DesignAuditInput) => auditDesign(input).findings.map((f) => `${f.severity}:${f.ruleId}`);

describe('sample project audit', () => {
  const report = auditDesign(baseInput());

  it('finds no critical problems in the concept-stage sample', () => {
    expect(report.counts.critical).toBe(0);
    expect(report.readiness.clientPresentation.ready).toBe(true);
  });

  it('surfaces the real safety and accessibility gaps as major findings', () => {
    const majors = report.findings.filter((f) => f.severity === 'major').map((f) => f.ruleId);
    expect(majors).toEqual(expect.arrayContaining(['wet-floor-slip-data', 'wet-zone-ip-rating', 'requirement-not-met']));
  });

  it('flags the overdue layout approval', () => {
    expect(report.findings.some((f) => f.ruleId === 'approval-overdue' && f.subjectIds.includes('apr-bath-layout'))).toBe(true);
  });

  it('is never construction-ready at concept stage', () => {
    expect(report.readiness.construction.ready).toBe(false);
    expect(report.readiness.construction.blockers.join(' ')).toMatch(/concept phase/);
    expect(report.readiness.coordination.ready).toBe(false);
  });

  it('produces stable, unique finding ids', () => {
    const ids = report.findings.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(auditDesign(baseInput()).findings.map((f) => f.id)).toEqual(ids);
  });

  it('sorts findings by severity', () => {
    const order = ['critical', 'major', 'minor', 'info'];
    const ranks = report.findings.map((f) => order.indexOf(f.severity));
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
  });
});

describe('phase-scaled severity', () => {
  it('maps phases to bands', () => {
    expect(phaseBand('concept')).toBe('early');
    expect(phaseBand('design-development')).toBe('development');
    expect(phaseBand('documentation')).toBe('late');
  });

  it('escalates missing product information as documentation approaches', () => {
    const input = baseInput();
    expect(rules(input)).toContain('minor:product-information-missing');
    input.project = { ...input.project, phase: 'documentation' };
    expect(rules(input)).toContain('critical:product-information-missing');
    expect(rules(input)).toContain('critical:sample-data-in-use');
  });
});

describe('construction-readiness language', () => {
  it('detects claims and ignores negated uses', () => {
    expect(findConstructionReadyClaims('Layout issued for construction.')).toEqual(['issued for construction']);
    expect(findConstructionReadyClaims('These are the final drawings')).toEqual(['final drawings']);
    expect(findConstructionReadyClaims('GFC set attached')).toEqual(['GFC']);
    expect(findConstructionReadyClaims('Concept layout — not issued for construction.')).toEqual([]);
    expect(findConstructionReadyClaims('Verify before it is issued for construction.')).toEqual([]);
    expect(findConstructionReadyClaims('Concept layout rev A is for discussion only and is not for construction.')).toEqual([]);
  });

  it('raises a critical finding when concept data claims construction readiness', () => {
    const input = baseInput();
    const room = input.rooms[0] as Room;
    room.notes = [...room.notes, { id: 'note-gfc', text: 'Layout is construction-ready.', certainty: 'assumed' }];
    expect(rules(input)).toContain('critical:construction-claim');
  });

  it('raises a critical finding when unverified items are issued for construction', () => {
    const input = baseInput();
    input.project = { ...input.project, phase: 'documentation', documentStatus: 'for-construction' };
    expect(rules(input)).toContain('critical:document-status-premature');
  });
});

describe('metric units', () => {
  it('detects imperial measurements', () => {
    expect(findImperialUnits('Room is 10 ft wide')).toEqual(['10 ft']);
    expect(findImperialUnits('Carpet area 1,200 sq ft')).toEqual(['1,200 sq ft']);
    expect(findImperialUnits('Flat of 1450 sft')).toEqual(['1450 sft']);
    expect(findImperialUnits('Door 2\'6" wide')).toEqual(['2\'6"']);
    expect(findImperialUnits('A 36" vanity')).toEqual(['36"']);
    expect(findImperialUnits('Mirror 24 inches')).toEqual(['24 inches']);
  });

  it('does not flag metric values or IP codes', () => {
    expect(findImperialUnits('900 mm clear opening, IP44, 2 in each bathroom, 3.96 m²')).toEqual([]);
  });

  it('raises a finding for imperial units in project data', () => {
    const input = baseInput();
    input.project = { ...input.project, name: 'Mehta Residence, 1450 sft' };
    expect(rules(input)).toContain('minor:imperial-units');
  });
});

describe('material and lighting rules', () => {
  it('treats a polished finish on a wet floor as critical', () => {
    const input = baseInput();
    const wetFloor = input.materials.find((m) => m.id === 'mat-kota-wet-floor') as Material;
    wetFloor.finish = { value: 'stone-polished', certainty: 'requires-approval', source: 'Test' };
    expect(rules(input)).toContain('critical:wet-floor-finish');
  });

  it('accepts confirmed slip-resistance data', () => {
    const input = baseInput();
    const wetFloor = input.materials.find((m) => m.id === 'mat-kota-wet-floor') as Material;
    wetFloor.properties.slipResistance = confirmed('Test value from fixture report');
    expect(rules(input)).not.toContain('major:wet-floor-slip-data');
  });

  it('flags an insufficient IP rating in zone 1 as critical', () => {
    const input = baseInput();
    const fixture = input.rooms[0]?.lighting?.fixtures.find((f) => f.id === 'fx-shower-downlight');
    if (!fixture) throw new Error('fixture missing');
    fixture.ipRating = confirmed('IP20');
    expect(rules(input)).toContain('critical:wet-zone-ip-rating');
  });

  it('flags mixed colour temperatures in ambient and task layers', () => {
    const input = baseInput();
    const mirror = input.rooms[0]?.lighting?.fixtures.find((f) => f.id === 'fx-mirror');
    if (!mirror) throw new Error('fixture missing');
    mirror.colourTemperatureK = confirmed(4000);
    expect(rules(input)).toContain('minor:colour-temperature-consistency');
  });

  it('flags wet rooms with no accessibility requirements when the household needs them', () => {
    const input = baseInput();
    const room = input.rooms[0] as Room;
    room.requirements = room.requirements.filter((r) => r.category !== 'accessibility');
    expect(rules(input)).toContain('major:accessibility-coverage');
  });
});

describe('scoring', () => {
  it('deducts by severity and caps repeated findings per rule', () => {
    expect(scoreFindings([])).toBe(100);
    expect(scoreFindings([{ ruleId: 'imperial-units', severity: 'minor' }])).toBe(97);
    const repeated = Array.from({ length: 10 }, () => ({ ruleId: 'product-information-missing' as const, severity: 'minor' as const }));
    expect(scoreFindings(repeated)).toBe(94);
    expect(scoreFindings(Array.from({ length: 10 }, () => ({ ruleId: 'construction-claim' as const, severity: 'critical' as const })))).toBe(60);
  });
});

describe('construction readiness gate', () => {
  const issuedForConstruction = (overrides: Partial<DesignAuditInput> = {}): DesignAuditInput => {
    const input = { ...baseInput(), products: [], materials: [], ...overrides };
    input.project.phase = 'documentation';
    input.project.documentStatus = 'for-construction';
    return input;
  };

  it('is not ready while major issues are open', () => {
    const report = auditDesign(issuedForConstruction());
    expect(sample.project.issues.some((i) => i.severity === 'major' && i.status === 'open')).toBe(true);
    expect(report.findings.map((f) => f.ruleId)).toContain('open-major-issue');
    expect(report.readiness.construction.ready).toBe(false);
  });

  it('is not ready with no products or materials recorded, or with draft approvals', () => {
    const input = issuedForConstruction();
    input.project.issues = [];
    input.project.approvals = input.project.approvals.filter((a) => a.status === 'draft');
    const report = auditDesign(input);
    expect(report.readiness.construction.blockers).toContain('No products or materials are recorded.');
    expect(report.readiness.construction.blockers).toContain('Approvals are pending or still in draft.');
    expect(report.readiness.construction.ready).toBe(false);
  });

  it('always flags construction language in the brief', () => {
    const input = issuedForConstruction();
    input.project.designBrief!.objectives[0]!.text = 'Final drawings issued for construction.';
    expect(auditDesign(input).findings.map((f) => f.ruleId)).toContain('construction-claim');
  });
});
