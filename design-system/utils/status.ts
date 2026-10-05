import type { Approval, ApprovalStatus } from '../schemas/approval';
import type { Certainty, ItemStatus, SpecValue, VerificationState } from '../schemas/common';
import type { IssueSeverity, IssueStatus } from '../schemas/issue';
import type { SampleStatus } from '../schemas/material';
import type { DocumentStatus, ProjectPhase } from '../schemas/project';
import type { Requirement, RequirementPriority, RequirementStatus, RoomStatus } from '../schemas/room';

/** Visual tone. Each tone maps to a `color.status.*` token group. */
export type StatusTone = 'neutral' | 'info' | 'positive' | 'caution' | 'critical' | 'pending';

export interface StatusDescriptor {
  label: string;
  tone: StatusTone;
  /** Plain-language explanation for tooltips and screen-reader descriptions. */
  description: string;
  /** Dashed outline — used for "unknown" so it is distinguishable without colour. */
  dashed?: boolean;
}

export type CheckResult = 'pass' | 'warning' | 'fail' | 'unknown';
export type CompatibilityOutcome = 'compatible' | 'conditional' | 'incompatible' | 'cannot-determine';

/** Every status vocabulary the interface can render, keyed by kind. */
export interface StatusKinds {
  certainty: Certainty;
  item: ItemStatus;
  verification: VerificationState;
  approval: ApprovalStatus;
  severity: IssueSeverity;
  issue: IssueStatus;
  document: DocumentStatus;
  phase: ProjectPhase;
  room: RoomStatus;
  requirement: RequirementStatus;
  priority: RequirementPriority;
  sample: SampleStatus;
  check: CheckResult;
  compatibility: CompatibilityOutcome;
}
export type StatusKind = keyof StatusKinds;

const d = (label: string, tone: StatusTone, description: string, dashed = false): StatusDescriptor =>
  dashed ? { label, tone, description, dashed } : { label, tone, description };

const REGISTRY: { [K in StatusKind]: Record<StatusKinds[K], StatusDescriptor> } = {
  certainty: {
    confirmed: d('Confirmed', 'positive', 'Verified against a cited source.'),
    assumed: d('Assumed', 'info', 'Working assumption — see the note for what it rests on.'),
    unknown: d('Unknown', 'neutral', 'Not known. Do not rely on it.', true),
    'requires-verification': d('Requires verification', 'caution', 'Recorded but not yet checked against an authoritative source.'),
    'requires-approval': d('Requires approval', 'pending', 'Proposed; awaiting approval.'),
  },
  item: {
    proposed: d('Proposed', 'neutral', 'Suggested for consideration.'),
    shortlisted: d('Shortlisted', 'info', 'Under active consideration.'),
    selected: d('Selected', 'info', 'Chosen by the designer; not yet approved by the client.'),
    'client-approved': d('Client approved', 'positive', 'Approved by the client.'),
    ordered: d('Ordered', 'positive', 'Purchase order placed.'),
    delivered: d('Delivered', 'positive', 'Received on site.'),
    installed: d('Installed', 'positive', 'Installed on site.'),
    rejected: d('Rejected', 'critical', 'No longer under consideration.'),
    discontinued: d('Discontinued', 'critical', 'No longer available from the manufacturer.'),
  },
  verification: {
    verified: d('Verified', 'positive', 'Checked against manufacturer or supplier documentation.'),
    'partially-verified': d('Partially verified', 'caution', 'Some information has been checked; gaps remain.'),
    unverified: d('Unverified', 'caution', 'Not yet checked. Do not order or document from it.'),
    'sample-data': d('Sample data', 'neutral', 'Demonstration data. Never a source of truth.', true),
  },
  approval: {
    draft: d('Draft', 'neutral', 'Not yet sent for approval.'),
    pending: d('Awaiting approval', 'pending', 'Sent; decision pending.'),
    approved: d('Approved', 'positive', 'Approved and recorded.'),
    'approved-with-comments': d('Approved with comments', 'caution', 'Approved subject to conditions.'),
    rejected: d('Rejected', 'critical', 'Not approved.'),
    superseded: d('Superseded', 'neutral', 'Replaced by a later revision.'),
    withdrawn: d('Withdrawn', 'neutral', 'Withdrawn by the studio.'),
  },
  severity: {
    critical: d('Critical', 'critical', 'Blocks progress or creates a safety, cost or liability risk.'),
    major: d('Major', 'caution', 'Must be resolved before the next issue of information.'),
    minor: d('Minor', 'info', 'Should be resolved; does not block progress.'),
    info: d('Note', 'neutral', 'For information.'),
  },
  issue: {
    open: d('Open', 'caution', 'Not yet addressed.'),
    'in-progress': d('In progress', 'info', 'Being addressed.'),
    resolved: d('Resolved', 'positive', 'Resolved; awaiting close-out.'),
    'accepted-risk': d('Accepted risk', 'pending', 'Knowingly accepted by the named owner.'),
    closed: d('Closed', 'neutral', 'Closed.'),
  },
  document: {
    draft: d('Draft', 'neutral', 'Work in progress. Not for issue.'),
    concept: d('Concept — not for construction', 'info', 'Conceptual design intent. Not for construction or procurement.'),
    'for-client-review': d('For client review — not for construction', 'pending', 'Issued for the client to review. Not for construction.'),
    'for-coordination': d('For coordination — not for construction', 'caution', 'Issued to consultants for coordination. Not for construction.'),
    'for-tender': d('For tender — not for construction', 'caution', 'Issued for pricing. Not for construction.'),
    'for-construction': d('For construction', 'positive', 'Verified and approved for construction.'),
  },
  phase: {
    intake: d('Intake', 'neutral', 'Collecting client information.'),
    brief: d('Brief', 'neutral', 'Defining the design brief.'),
    concept: d('Concept', 'info', 'Developing the design concept.'),
    'design-development': d('Design development', 'info', 'Developing and coordinating the design.'),
    documentation: d('Documentation', 'caution', 'Preparing verified documentation.'),
    procurement: d('Procurement', 'caution', 'Ordering verified products and materials.'),
    execution: d('Execution', 'positive', 'On site.'),
    handover: d('Handover', 'positive', 'Completing and handing over.'),
  },
  room: {
    'not-started': d('Not started', 'neutral', 'Design work has not started.'),
    'in-progress': d('In progress', 'info', 'Design in progress.'),
    'client-review': d('Client review', 'pending', 'With the client for review.'),
    approved: d('Approved', 'positive', 'Approved by the client.'),
    'on-hold': d('On hold', 'caution', 'Paused.'),
  },
  requirement: {
    met: d('Met', 'positive', 'Fully addressed by the design.'),
    'partially-met': d('Partially met', 'caution', 'Partly addressed; see notes.'),
    'not-met': d('Not met', 'critical', 'Not addressed by the current design.'),
    'not-assessed': d('Not assessed', 'neutral', 'Not yet assessed.', true),
  },
  priority: {
    must: d('Must', 'critical', 'Essential.'),
    should: d('Should', 'caution', 'Important but negotiable.'),
    could: d('Could', 'neutral', 'Desirable.'),
  },
  sample: {
    'not-requested': d('Sample not requested', 'neutral', 'No physical sample requested yet.', true),
    requested: d('Sample requested', 'pending', 'Physical sample requested from the supplier.'),
    received: d('Sample received', 'info', 'Physical sample in the studio.'),
    approved: d('Sample approved', 'positive', 'Physical sample approved by the client.'),
    rejected: d('Sample rejected', 'critical', 'Physical sample rejected.'),
  },
  check: {
    pass: d('Pass', 'positive', 'Check passed.'),
    warning: d('Condition', 'caution', 'Works only if the stated condition is met.'),
    fail: d('Fail', 'critical', 'Check failed.'),
    unknown: d('Cannot check', 'neutral', 'Information needed for this check is missing.', true),
  },
  compatibility: {
    compatible: d('Compatible', 'positive', 'All checks passed on the recorded information.'),
    conditional: d('Conditional', 'caution', 'Compatible only if the listed conditions are met.'),
    incompatible: d('Incompatible', 'critical', 'At least one check failed.'),
    'cannot-determine': d('Cannot determine', 'neutral', 'Information required for the checks is missing.', true),
  },
};

export function describeStatus<K extends StatusKind>(kind: K, value: StatusKinds[K]): StatusDescriptor {
  return REGISTRY[kind][value];
}

// ---------------------------------------------------------------------------
// Certainty arithmetic
// ---------------------------------------------------------------------------

/** Higher is stronger. A conclusion is only as certain as its weakest input. */
const CERTAINTY_RANK: Record<Certainty, number> = {
  confirmed: 4,
  'requires-approval': 3,
  assumed: 2,
  'requires-verification': 1,
  unknown: 0,
};

export function certaintyRank(certainty: Certainty): number {
  return CERTAINTY_RANK[certainty];
}

/** The weakest of the given certainty levels (`confirmed` when none are given). */
export function combineCertainty(...levels: Certainty[]): Certainty {
  return levels.reduce<Certainty>(
    (weakest, level) => (CERTAINTY_RANK[level] < CERTAINTY_RANK[weakest] ? level : weakest),
    'confirmed',
  );
}

export type CertaintyCounts = Record<Certainty, number> & { total: number };

export function countCertainty(specs: readonly Pick<SpecValue<unknown>, 'certainty'>[]): CertaintyCounts {
  const counts: CertaintyCounts = {
    confirmed: 0,
    assumed: 0,
    unknown: 0,
    'requires-verification': 0,
    'requires-approval': 0,
    total: specs.length,
  };
  for (const spec of specs) counts[spec.certainty] += 1;
  return counts;
}

// ---------------------------------------------------------------------------
// Summaries
// ---------------------------------------------------------------------------

export interface VerificationSummary {
  total: number;
  verified: number;
  partiallyVerified: number;
  unverified: number;
  sampleData: number;
  /** Whole-number percentage of items fully verified. */
  percentVerified: number;
}

export function summariseVerification(items: readonly { verification: { state: VerificationState } }[]): VerificationSummary {
  const count = (state: VerificationState) => items.filter((item) => item.verification.state === state).length;
  const verified = count('verified');
  return {
    total: items.length,
    verified,
    partiallyVerified: count('partially-verified'),
    unverified: count('unverified'),
    sampleData: count('sample-data'),
    percentVerified: items.length === 0 ? 0 : Math.round((verified / items.length) * 100),
  };
}

export interface RequirementSummary {
  total: number;
  met: number;
  partiallyMet: number;
  notMet: number;
  notAssessed: number;
  /** "Must" requirements that are not fully met. */
  openMusts: number;
  /** Met counts 1, partially met counts 0.5. */
  percentCovered: number;
}

export function summariseRequirements(requirements: readonly Requirement[]): RequirementSummary {
  const count = (status: RequirementStatus) => requirements.filter((r) => r.status === status).length;
  const met = count('met');
  const partiallyMet = count('partially-met');
  return {
    total: requirements.length,
    met,
    partiallyMet,
    notMet: count('not-met'),
    notAssessed: count('not-assessed'),
    openMusts: requirements.filter((r) => r.priority === 'must' && r.status !== 'met').length,
    percentCovered: requirements.length === 0 ? 0 : Math.round(((met + partiallyMet * 0.5) / requirements.length) * 100),
  };
}

/** True when an approval is still awaiting a decision after its due date. `asOf` is `YYYY-MM-DD`. */
export function isApprovalOverdue(approval: Pick<Approval, 'status' | 'dueOn'>, asOf: string): boolean {
  return approval.status === 'pending' && approval.dueOn !== undefined && approval.dueOn < asOf;
}

export interface ApprovalSummary {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  overdue: number;
}

export function summariseApprovals(approvals: readonly Approval[], asOf: string): ApprovalSummary {
  return {
    total: approvals.length,
    pending: approvals.filter((a) => a.status === 'pending').length,
    approved: approvals.filter((a) => a.status === 'approved' || a.status === 'approved-with-comments').length,
    rejected: approvals.filter((a) => a.status === 'rejected').length,
    overdue: approvals.filter((a) => isApprovalOverdue(a, asOf)).length,
  };
}
