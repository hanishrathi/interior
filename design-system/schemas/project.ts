import { z } from 'zod';
import { approvalSchema } from './approval';
import {
  budgetSchema,
  idSchema,
  isoDateSchema,
  recommendationSchema,
  specValue,
  statementSchema,
  textSchema,
} from './common';
import { issueSchema } from './issue';
import { ROOM_TYPES } from './room';

export const PROJECT_PHASES = [
  'intake',
  'brief',
  'concept',
  'design-development',
  'documentation',
  'procurement',
  'execution',
  'handover',
] as const;
export type ProjectPhase = (typeof PROJECT_PHASES)[number];

/**
 * Maturity of issued information. Only `for-construction` may be built from, and it is
 * reserved for verified, approved documentation — never for concept material.
 */
export const DOCUMENT_STATUSES = [
  'draft',
  'concept',
  'for-client-review',
  'for-coordination',
  'for-tender',
  'for-construction',
] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

/** The most mature document status each phase may carry. */
export const MAX_DOCUMENT_STATUS_BY_PHASE: Record<ProjectPhase, DocumentStatus> = {
  intake: 'draft',
  brief: 'for-client-review',
  concept: 'for-client-review',
  'design-development': 'for-coordination',
  documentation: 'for-construction',
  procurement: 'for-construction',
  execution: 'for-construction',
  handover: 'for-construction',
};

export function documentStatusRank(status: DocumentStatus): number {
  return DOCUMENT_STATUSES.indexOf(status);
}

/** Document statuses a design brief may carry: a brief is conceptual by definition. */
export const BRIEF_DOCUMENT_STATUSES: readonly DocumentStatus[] = ['draft', 'concept', 'for-client-review'];

export const PROPERTY_TYPES = [
  'apartment',
  'independent-house',
  'villa',
  'row-house',
  'penthouse',
  'office',
  'retail',
  'hospitality',
  'other',
] as const;

export const designBriefSchema = z
  .object({
    id: idSchema,
    projectId: idSchema,
    version: textSchema,
    documentStatus: z.enum(DOCUMENT_STATUSES),
    preparedBy: textSchema,
    preparedOn: isoDateSchema,
    summary: textSchema,
    objectives: z.array(statementSchema).min(1),
    styleDirection: z.object({
      keywords: z.array(textSchema).min(1),
      narrative: textSchema,
      references: z.array(statementSchema),
      avoid: z.array(statementSchema),
    }),
    palette: z.object({
      materialIds: z.array(idSchema),
      notes: z.array(statementSchema),
    }),
    functionalRequirements: z.array(statementSchema),
    constraints: z.array(statementSchema),
    budget: budgetSchema,
    timeline: z.array(statementSchema),
    recommendations: z.array(recommendationSchema),
    assumptions: z.array(statementSchema),
    openQuestions: z.array(statementSchema),
  })
  .superRefine((brief, ctx) => {
    if (!BRIEF_DOCUMENT_STATUSES.includes(brief.documentStatus)) {
      ctx.addIssue({
        code: 'custom',
        path: ['documentStatus'],
        message: `A design brief is conceptual and can only be ${BRIEF_DOCUMENT_STATUSES.join(', ')}.`,
      });
    }
    brief.assumptions.forEach((assumption, index) => {
      if (assumption.certainty === 'confirmed') {
        ctx.addIssue({
          code: 'custom',
          path: ['assumptions', index, 'certainty'],
          message: 'A confirmed statement is not an assumption — move it to the relevant section.',
        });
      }
    });
    brief.openQuestions.forEach((question, index) => {
      if (question.certainty === 'confirmed' || question.certainty === 'assumed') {
        ctx.addIssue({
          code: 'custom',
          path: ['openQuestions', index, 'certainty'],
          message: 'Open questions must be unknown, requires-verification or requires-approval.',
        });
      }
    });
  });
export type DesignBrief = z.infer<typeof designBriefSchema>;

export const roomSummarySchema = z.object({
  id: idSchema,
  name: textSchema,
  type: z.enum(ROOM_TYPES),
});

export const projectSchema = z
  .object({
    id: idSchema,
    code: textSchema,
    name: textSchema,
    clientId: idSchema,
    location: z.object({
      locality: textSchema,
      city: textSchema,
      state: textSchema,
      country: textSchema,
      pinCode: z.string().regex(/^\d{6}$/, 'Indian PIN codes have six digits.').optional(),
    }),
    propertyType: z.enum(PROPERTY_TYPES),
    carpetAreaM2: specValue(z.number().positive()),
    scope: z.array(statementSchema).min(1),
    phase: z.enum(PROJECT_PHASES),
    documentStatus: z.enum(DOCUMENT_STATUSES),
    team: z.array(z.object({ name: textSchema, role: textSchema })).min(1),
    startDate: isoDateSchema,
    targetCompletion: specValue(isoDateSchema),
    budget: budgetSchema,
    rooms: z.array(roomSummarySchema),
    designBrief: designBriefSchema.optional(),
    approvals: z.array(approvalSchema),
    issues: z.array(issueSchema),
  })
  .superRefine((project, ctx) => {
    const ceiling = MAX_DOCUMENT_STATUS_BY_PHASE[project.phase];
    if (documentStatusRank(project.documentStatus) > documentStatusRank(ceiling)) {
      ctx.addIssue({
        code: 'custom',
        path: ['documentStatus'],
        message: `A project in the ${project.phase} phase cannot issue "${project.documentStatus}" information (maximum: "${ceiling}"). Conceptual information is never construction-ready.`,
      });
    }
    if (project.designBrief && project.designBrief.projectId !== project.id) {
      ctx.addIssue({ code: 'custom', path: ['designBrief', 'projectId'], message: 'Brief must reference this project.' });
    }
    project.approvals.forEach((approval, index) => {
      if (approval.projectId !== project.id) {
        ctx.addIssue({ code: 'custom', path: ['approvals', index, 'projectId'], message: 'Approval belongs to another project.' });
      }
    });
    project.issues.forEach((issue, index) => {
      if (issue.projectId !== project.id) {
        ctx.addIssue({ code: 'custom', path: ['issues', index, 'projectId'], message: 'Issue belongs to another project.' });
      }
    });
    const roomIds = project.rooms.map((room) => room.id);
    if (new Set(roomIds).size !== roomIds.length) {
      ctx.addIssue({ code: 'custom', path: ['rooms'], message: 'Room ids must be unique.' });
    }
  });
export type Project = z.infer<typeof projectSchema>;
