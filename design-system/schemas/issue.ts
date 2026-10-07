import { z } from 'zod';
import { idSchema, isoDateSchema, textSchema } from './common';

export const ISSUE_SEVERITIES = ['critical', 'major', 'minor', 'info'] as const;
export type IssueSeverity = (typeof ISSUE_SEVERITIES)[number];

export const ISSUE_CATEGORIES = [
  'clearance',
  'compatibility',
  'missing-information',
  'verification',
  'approval',
  'accessibility',
  'safety',
  'services',
  'specification',
  'budget',
  'documentation',
  'consistency',
  'design-quality',
] as const;
export type IssueCategory = (typeof ISSUE_CATEGORIES)[number];

export const ISSUE_STATUSES = ['open', 'in-progress', 'resolved', 'accepted-risk', 'closed'] as const;
export type IssueStatus = (typeof ISSUE_STATUSES)[number];

export const ISSUE_ORIGINS = ['technical-review', 'design-audit', 'designer', 'client', 'contractor', 'consultant'] as const;

export const issueSchema = z
  .object({
    id: idSchema,
    projectId: idSchema,
    roomId: idSchema.optional(),
    title: textSchema,
    description: textSchema,
    severity: z.enum(ISSUE_SEVERITIES),
    category: z.enum(ISSUE_CATEGORIES),
    status: z.enum(ISSUE_STATUSES),
    raisedBy: z.enum(ISSUE_ORIGINS),
    raisedOn: isoDateSchema,
    owner: textSchema.optional(),
    dueOn: isoDateSchema.optional(),
    relatedIds: z.array(idSchema),
    resolution: textSchema.optional(),
    resolvedOn: isoDateSchema.optional(),
  })
  .superRefine((issue, ctx) => {
    if ((issue.status === 'resolved' || issue.status === 'closed') && (!issue.resolution || !issue.resolvedOn)) {
      ctx.addIssue({
        code: 'custom',
        path: ['resolution'],
        message: 'Resolved or closed issues must record the resolution and resolvedOn.',
      });
    }
    if (issue.status === 'accepted-risk' && (!issue.resolution || !issue.owner)) {
      ctx.addIssue({
        code: 'custom',
        path: ['resolution'],
        message: 'Accepted risks must record who accepted them (owner) and why (resolution).',
      });
    }
    if (issue.severity === 'critical' && (issue.status === 'open' || issue.status === 'in-progress') && !issue.owner) {
      ctx.addIssue({ code: 'custom', path: ['owner'], message: 'Critical issues must have an owner.' });
    }
    for (const field of ['dueOn', 'resolvedOn'] as const) {
      const date = issue[field];
      if (date && date < issue.raisedOn) {
        ctx.addIssue({ code: 'custom', path: [field], message: `${field} cannot be before raisedOn.` });
      }
    }
  });
export type Issue = z.infer<typeof issueSchema>;
