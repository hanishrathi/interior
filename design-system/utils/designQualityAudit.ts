import type { Client } from '../schemas/client';
import { collectSpecValues } from '../schemas/common';
import type { IssueCategory, IssueSeverity } from '../schemas/issue';
import { WET_FLOOR_APPLICATIONS, type Material } from '../schemas/material';
import type { Product } from '../schemas/product';
import { PROJECT_PHASES, type Project, type ProjectPhase } from '../schemas/project';
import { WET_ROOM_TYPES, type Room } from '../schemas/room';
import { finishTokens } from '../tokens';
import { formatDate, formatKelvin, humanize, pluralize } from './formatting';
import { checkIpRating, checkProductCompleteness } from './productCompatibility';
import { isApprovalOverdue } from './status';
import { collectTextFields, findConstructionReadyClaims, findImperialUnits, scanTextFields } from './validation';

/**
 * Design quality audit: a deterministic review of a project's records against the
 * Clawed Design principles. It flags; it never fixes. Every finding names its subject,
 * explains the risk and recommends the next step.
 */

export type AuditRuleId =
  | 'product-information-missing'
  | 'product-information-unconfirmed'
  | 'approved-before-verification'
  | 'sample-data-in-use'
  | 'construction-claim'
  | 'document-status-premature'
  | 'imperial-units'
  | 'requirement-not-met'
  | 'requirement-unsupported'
  | 'approval-overdue'
  | 'wet-floor-finish'
  | 'wet-floor-slip-data'
  | 'wet-zone-ip-rating'
  | 'accessibility-coverage'
  | 'palette-restraint'
  | 'colour-temperature-consistency'
  | 'open-critical-issue'
  | 'open-major-issue'
  | 'information-maturity';

export interface AuditFinding {
  /** Stable id: `${ruleId}:${subjectId}` (plus detail where one subject can trigger a rule twice). */
  id: string;
  ruleId: AuditRuleId;
  severity: IssueSeverity;
  category: IssueCategory;
  title: string;
  message: string;
  recommendation: string;
  subjectIds: string[];
}

export interface ReadinessGate {
  ready: boolean;
  blockers: string[];
}

export interface DesignAuditReport {
  checkedOn: string;
  /**
   * 0–100. Each finding deducts by severity (critical 20, major 8, minor 3, info 0); a rule's total
   * deduction is capped at twice its largest single deduction so one repeated gap cannot dominate.
   */
  score: number;
  counts: Record<IssueSeverity, number>;
  findings: AuditFinding[];
  readiness: {
    clientPresentation: ReadinessGate;
    coordination: ReadinessGate;
    construction: ReadinessGate;
  };
}

export interface DesignAuditInput {
  project: Project;
  client?: Client;
  rooms: readonly Room[];
  products: readonly Product[];
  materials: readonly Material[];
  /** Audit date, `YYYY-MM-DD`. Passed in so results are reproducible. */
  asOf: string;
}

export const SEVERITY_PENALTY: Record<IssueSeverity, number> = { critical: 20, major: 8, minor: 3, info: 0 };
const SEVERITY_ORDER: readonly IssueSeverity[] = ['critical', 'major', 'minor', 'info'];

/** More distinct materials than this in one room is flagged as a palette-restraint note. */
export const PALETTE_MATERIAL_LIMIT = 6;
/** Colour-temperature spread within ambient and task layers that is flagged. */
export const CCT_SPREAD_LIMIT_K = 500;

const phaseIndex = (phase: ProjectPhase) => PROJECT_PHASES.indexOf(phase);

type PhaseBand = 'early' | 'development' | 'late';

/** Intake–concept is early; design development is development; documentation onwards is late. */
export function phaseBand(phase: ProjectPhase): PhaseBand {
  if (phaseIndex(phase) < phaseIndex('design-development')) return 'early';
  if (phaseIndex(phase) < phaseIndex('documentation')) return 'development';
  return 'late';
}

/** Total score deduction for a set of findings, capped per rule. */
export function scoreFindings(findings: readonly Pick<AuditFinding, 'ruleId' | 'severity'>[]): number {
  const byRule = new Map<AuditRuleId, number[]>();
  for (const finding of findings) {
    byRule.set(finding.ruleId, [...(byRule.get(finding.ruleId) ?? []), SEVERITY_PENALTY[finding.severity]]);
  }
  let deduction = 0;
  for (const penalties of byRule.values()) {
    const total = penalties.reduce((sum, penalty) => sum + penalty, 0);
    deduction += Math.min(total, 2 * Math.max(...penalties));
  }
  return Math.max(0, 100 - deduction);
}

type Draft = Omit<AuditFinding, 'id'> & { detail?: string };

export function auditDesign(input: DesignAuditInput): DesignAuditReport {
  const { project, client, rooms, products, materials, asOf } = input;
  const drafts: Draft[] = [];
  const add = (draft: Draft) => drafts.push(draft);
  const band = phaseBand(project.phase);
  /** Gaps that are normal at concept stage become serious as documentation approaches. */
  const byPhase = (early: IssueSeverity, development: IssueSeverity, late: IssueSeverity): IssueSeverity =>
    ({ early, development, late })[band];

  // --- Products -----------------------------------------------------------
  for (const product of products) {
    const { missing, unconfirmed } = checkProductCompleteness(product);
    if (missing.length > 0) {
      add({
        ruleId: 'product-information-missing',
        severity: byPhase('minor', 'major', 'critical'),
        category: 'missing-information',
        title: `${product.name}: information missing`,
        message: `Missing ${missing.map((f) => f.label.toLowerCase()).join(', ')}. Missing information is marked, not invented.`,
        recommendation: "Obtain the manufacturer's specification sheet or a dealer quotation for the exact model.",
        subjectIds: [product.id],
      });
    } else if (unconfirmed.length > 0) {
      add({
        ruleId: 'product-information-unconfirmed',
        severity: byPhase('info', 'minor', 'major'),
        category: 'verification',
        title: `${product.name}: information not yet confirmed`,
        message: `Not confirmed: ${unconfirmed.map((f) => f.label.toLowerCase()).join(', ')}.`,
        recommendation: 'Verify against manufacturer documentation before the product is selected.',
        subjectIds: [product.id],
      });
    }
    if (product.source.isSample) {
      add({
        ruleId: 'sample-data-in-use',
        severity: byPhase('info', 'major', 'critical'),
        category: 'verification',
        title: `${product.name}: sample data`,
        message: 'This record is demonstration data and is not a source of truth.',
        recommendation: 'Replace with information from a real, cited source before selection.',
        subjectIds: [product.id],
      });
    }
  }

  // --- Products and materials: approval before verification ----------------
  for (const item of [...products, ...materials]) {
    if (item.status === 'client-approved' && item.verification.state !== 'verified') {
      add({
        ruleId: 'approved-before-verification',
        severity: 'major',
        category: 'verification',
        title: `${item.name}: approved but not verified`,
        message: 'The client has approved an item whose information is not verified.',
        recommendation: 'Verify before ordering, and re-confirm the approval if anything changes.',
        subjectIds: [item.id],
      });
    }
  }

  // --- Materials on wet floors ---------------------------------------------
  for (const material of materials) {
    const wetUses = material.applications.filter((a) => WET_FLOOR_APPLICATIONS.includes(a));
    if (wetUses.length === 0) continue;
    const finish = material.finish.value ? finishTokens[material.finish.value] : undefined;
    if (finish?.wetFloorGuidance === 'avoid') {
      add({
        ruleId: 'wet-floor-finish',
        severity: 'critical',
        category: 'safety',
        title: `${material.code} ${material.name}: unsuitable finish for wet floors`,
        message: `The "${finish.label}" finish is generally slippery when wet but is proposed for ${wetUses.map(humanize).join(', ').toLowerCase()}.`,
        recommendation: 'Change to a textured or honed finish and obtain slip-resistance test data.',
        subjectIds: [material.id],
      });
    }
    const slip = material.properties.slipResistance;
    if (slip.certainty !== 'confirmed') {
      add({
        ruleId: 'wet-floor-slip-data',
        severity: 'major',
        category: 'safety',
        title: `${material.code} ${material.name}: slip resistance not confirmed`,
        message: `Proposed for ${wetUses.map(humanize).join(', ').toLowerCase()}; slip resistance is ${humanize(slip.certainty).toLowerCase()}.`,
        recommendation: "Obtain the supplier's slip-resistance test report for the specified finish.",
        subjectIds: [material.id],
      });
    }
  }

  // --- Rooms ----------------------------------------------------------------
  const seniorsInHousehold = client?.household.members.some((m) => m.ageGroup === 'senior') ?? false;
  const accessibilityNeeds = (client?.accessibilityNeeds.length ?? 0) > 0 || seniorsInHousehold;

  for (const room of rooms) {
    for (const requirement of room.requirements) {
      const unmet = requirement.status === 'not-met' || requirement.status === 'not-assessed';
      if (unmet && requirement.priority !== 'could') {
        add({
          ruleId: 'requirement-not-met',
          severity: requirement.priority === 'must' ? 'major' : 'minor',
          category: requirement.category === 'accessibility' || requirement.category === 'safety' ? requirement.category : 'design-quality',
          title: `${room.name}: "${requirement.text}" ${requirement.status === 'not-met' ? 'not met' : 'not assessed'}`,
          message: `A ${requirement.priority.toUpperCase()} requirement from the ${requirement.source} is ${humanize(requirement.status).toLowerCase()}.`,
          recommendation: 'Address it in the design or record the decision not to, with the client.',
          subjectIds: [room.id, requirement.id],
          detail: requirement.id,
        });
      }
      if (requirement.status === 'met' && requirement.addressedBy.length === 0) {
        add({
          ruleId: 'requirement-unsupported',
          severity: 'minor',
          category: 'consistency',
          title: `${room.name}: "${requirement.text}" marked met without support`,
          message: 'Marked as met, but no product, material or recommendation is linked to it.',
          recommendation: 'Link the items that satisfy it, or change the status.',
          subjectIds: [room.id, requirement.id],
          detail: requirement.id,
        });
      }
    }

    if (WET_ROOM_TYPES.includes(room.type) && accessibilityNeeds) {
      const covered = room.requirements.some((r) => r.category === 'accessibility');
      if (!covered) {
        add({
          ruleId: 'accessibility-coverage',
          severity: 'major',
          category: 'accessibility',
          title: `${room.name}: no accessibility requirements recorded`,
          message: 'The household includes accessibility needs or an older member, but this wet room records no accessibility requirements.',
          recommendation: 'Record requirements such as grab bars, slip resistance, level access and door width with the client.',
          subjectIds: [room.id],
        });
      }
    }

    if (room.materialIds.length > PALETTE_MATERIAL_LIMIT) {
      add({
        ruleId: 'palette-restraint',
        severity: 'info',
        category: 'design-quality',
        title: `${room.name}: ${room.materialIds.length} materials`,
        message: `More than ${PALETTE_MATERIAL_LIMIT} distinct materials in one room can dilute the design intent.`,
        recommendation: 'Review whether each material earns its place.',
        subjectIds: [room.id],
      });
    }

    const fixtures = room.lighting?.fixtures ?? [];
    for (const fixture of fixtures) {
      if (!fixture.bathroomZone || fixture.bathroomZone === 'outside-zones') continue;
      const result = checkIpRating({ id: fixture.id, ipRating: fixture.ipRating }, fixture.bathroomZone);
      if (result.result === 'pass') continue;
      add({
        ruleId: 'wet-zone-ip-rating',
        severity: result.result === 'fail' ? 'critical' : 'major',
        category: 'safety',
        title: `${room.name}: ${fixture.label} — IP rating ${result.result === 'fail' ? 'insufficient' : 'unknown'}`,
        message: result.message,
        recommendation: 'Confirm the fixture IP rating and the zone boundaries with the electrical consultant.',
        subjectIds: [room.id, fixture.id],
        detail: fixture.id,
      });
    }

    const temperatures = fixtures
      .filter((f) => f.layer === 'ambient' || f.layer === 'task')
      .map((f) => f.colourTemperatureK.value)
      .filter((k): k is number => k !== null);
    if (temperatures.length > 1) {
      const spread = Math.max(...temperatures) - Math.min(...temperatures);
      if (spread > CCT_SPREAD_LIMIT_K) {
        add({
          ruleId: 'colour-temperature-consistency',
          severity: 'minor',
          category: 'design-quality',
          title: `${room.name}: mixed colour temperatures`,
          message: `Ambient and task lighting range from ${formatKelvin(Math.min(...temperatures))} to ${formatKelvin(Math.max(...temperatures))}.`,
          recommendation: `Keep ambient and task layers within ${CCT_SPREAD_LIMIT_K} K of each other unless the contrast is intentional.`,
          subjectIds: [room.id],
        });
      }
    }
  }

  // --- Approvals and issues -----------------------------------------------
  for (const approval of project.approvals) {
    if (isApprovalOverdue(approval, asOf)) {
      add({
        ruleId: 'approval-overdue',
        severity: 'minor',
        category: 'approval',
        title: `Approval overdue: ${approval.title}`,
        message: `Due ${formatDate(approval.dueOn ?? asOf)}; still awaiting ${approval.approver}.`,
        recommendation: 'Follow up with the approver and record the decision with evidence.',
        subjectIds: [approval.id],
      });
    }
  }
  for (const issue of project.issues) {
    if (issue.severity === 'critical' && (issue.status === 'open' || issue.status === 'in-progress')) {
      add({
        ruleId: 'open-critical-issue',
        severity: 'critical',
        category: issue.category,
        title: `Open critical issue: ${issue.title}`,
        message: issue.description,
        recommendation: `Resolve before issuing further information${issue.owner ? ` (owner: ${issue.owner})` : ''}.`,
        subjectIds: [issue.id],
      });
    } else if (issue.severity === 'major' && (issue.status === 'open' || issue.status === 'in-progress')) {
      add({
        ruleId: 'open-major-issue',
        severity: 'major',
        category: issue.category,
        title: `Open major issue: ${issue.title}`,
        message: issue.description,
        recommendation: `Resolve before the next issue of information${issue.owner ? ` (owner: ${issue.owner})` : ''}.`,
        subjectIds: [issue.id],
      });
    }
  }

  // --- Language and units ---------------------------------------------------
  const textFields = [
    ...collectTextFields(project, 'project'),
    ...rooms.flatMap((room, i) => collectTextFields(room, `rooms[${i}]`)),
    ...products.flatMap((product, i) => collectTextFields(product, `products[${i}]`)),
    ...materials.flatMap((material, i) => collectTextFields(material, `materials[${i}]`)),
  ];

  const items = [...products, ...materials];
  // Vacuous truth would let a project with no recorded items pass as "all verified".
  const allVerified = items.length > 0 && items.every((item) => item.verification.state === 'verified');
  const awaitingApproval = project.approvals.filter((a) => a.status === 'pending' || a.status === 'draft');
  const constructionIssued = project.documentStatus === 'for-construction';
  const legitimatelyIssued = constructionIssued && allVerified && awaitingApproval.length === 0;
  // A brief is conceptual, so construction language in it is always wrong.
  const scanned = legitimatelyIssued ? textFields.filter((field) => field.path.startsWith('project.designBrief')) : textFields;
  {
    for (const finding of scanTextFields(scanned, findConstructionReadyClaims)) {
      add({
        ruleId: 'construction-claim',
        severity: 'critical',
        category: 'documentation',
        title: `Construction-ready language: "${finding.match}"`,
        message: `"${finding.text}" (${finding.path}) presents information as construction-ready, but the project is at ${humanize(project.phase).toLowerCase()} and not all items are verified.`,
        recommendation: 'Remove the claim. Conceptual information must be labelled as concept, not for construction.',
        subjectIds: [project.id],
        detail: finding.path,
      });
    }
  }

  for (const finding of scanTextFields(textFields, findImperialUnits)) {
    add({
      ruleId: 'imperial-units',
      severity: 'minor',
      category: 'consistency',
      title: `Non-metric unit: "${finding.match}"`,
      message: `${finding.path}: "${finding.text}".`,
      recommendation: 'Express all measurements in metric units (mm, m, m²).',
      subjectIds: [project.id],
      detail: finding.path,
    });
  }

  if (constructionIssued) {
    const unverified = items.filter((item) => item.verification.state !== 'verified');
    const pending = awaitingApproval;
    if (items.length === 0 || unverified.length > 0 || pending.length > 0) {
      add({
        ruleId: 'document-status-premature',
        severity: 'critical',
        category: 'documentation',
        title: 'Issued for construction prematurely',
        message: `${pluralize(unverified.length, 'item')} unverified and ${pluralize(pending.length, 'approval')} pending.`,
        recommendation: 'Withdraw the construction issue until every item is verified and every approval recorded.',
        subjectIds: [project.id, ...unverified.map((item) => item.id)],
      });
    }
  }

  // --- Information maturity -------------------------------------------------
  const specs = [...products, ...materials].flatMap((item) => collectSpecValues(item));
  const unknownCount = specs.filter((entry) => entry.spec.value === null).length;
  if (specs.length > 0 && unknownCount / specs.length > 0.4) {
    add({
      ruleId: 'information-maturity',
      severity: byPhase('info', 'minor', 'major'),
      category: 'missing-information',
      title: `${Math.round((unknownCount / specs.length) * 100)}% of product and material information is unknown`,
      message: `${unknownCount} of ${specs.length} recorded values are unknown.`,
      recommendation:
        band === 'early'
          ? 'Expected at concept stage — plan the verification work before design development.'
          : 'Verify the outstanding information before issuing further documentation.',
      subjectIds: [project.id],
    });
  }

  // --- Assemble -------------------------------------------------------------
  const findings: AuditFinding[] = drafts
    .map(({ detail, ...finding }) => ({
      ...finding,
      id: [finding.ruleId, finding.subjectIds[0], detail].filter(Boolean).join(':'),
    }))
    .sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity));

  const counts: Record<IssueSeverity, number> = { critical: 0, major: 0, minor: 0, info: 0 };
  for (const finding of findings) counts[finding.severity] += 1;
  const score = scoreFindings(findings);

  const titles = (severities: IssueSeverity[]) =>
    findings.filter((f) => severities.includes(f.severity)).map((f) => f.title);

  const constructionBlockers = [
    ...(phaseIndex(project.phase) < phaseIndex('documentation') ? [`Project is at the ${humanize(project.phase).toLowerCase()} phase.`] : []),
    ...(items.length === 0 ? ['No products or materials are recorded.'] : allVerified ? [] : ['Not every product and material is verified.']),
    ...(awaitingApproval.length > 0 ? ['Approvals are pending or still in draft.'] : []),
    ...titles(['critical', 'major']),
  ];
  const coordinationBlockers = [
    ...(phaseIndex(project.phase) < phaseIndex('design-development') ? [`Project is at the ${humanize(project.phase).toLowerCase()} phase.`] : []),
    ...titles(['critical', 'major']),
  ];

  return {
    checkedOn: asOf,
    score,
    counts,
    findings,
    readiness: {
      clientPresentation: { ready: counts.critical === 0, blockers: titles(['critical']) },
      coordination: { ready: coordinationBlockers.length === 0, blockers: coordinationBlockers },
      construction: { ready: constructionBlockers.length === 0, blockers: constructionBlockers },
    },
  };
}

