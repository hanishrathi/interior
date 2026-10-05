import { z } from 'zod';
import { idSchema, isoDateSchema, textSchema } from './common';

export const APPROVAL_STATUSES = [
  'draft',
  'pending',
  'approved',
  'approved-with-comments',
  'rejected',
  'superseded',
  'withdrawn',
] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

export const DECIDED_APPROVAL_STATUSES: readonly ApprovalStatus[] = ['approved', 'approved-with-comments', 'rejected'];

export const APPROVAL_SUBJECTS = [
  'design-brief',
  'concept',
  'layout',
  'product',
  'material',
  'lighting',
  'budget',
  'variation',
  'drawing',
] as const;

/** How the decision was recorded. WhatsApp is common in Indian practice — keep a reference to the message. */
export const APPROVAL_CHANNELS = ['in-person', 'email', 'whatsapp', 'signed-document', 'client-portal'] as const;

export const approvalSchema = z
  .object({
    id: idSchema,
    projectId: idSchema,
    title: textSchema,
    description: textSchema,
    subject: z.object({ kind: z.enum(APPROVAL_SUBJECTS), refIds: z.array(idSchema) }),
    requestedBy: textSchema,
    approver: textSchema,
    status: z.enum(APPROVAL_STATUSES),
    requestedOn: isoDateSchema,
    dueOn: isoDateSchema.optional(),
    decidedOn: isoDateSchema.optional(),
    recordedVia: z.enum(APPROVAL_CHANNELS).optional(),
    /** Pointer to the evidence, e.g. "Email 14 Sep 2026, subject 'Bathroom concept'". */
    evidenceRef: textSchema.optional(),
    conditions: z.array(textSchema),
    comments: textSchema.optional(),
    revision: textSchema,
  })
  .superRefine((approval, ctx) => {
    if (DECIDED_APPROVAL_STATUSES.includes(approval.status)) {
      for (const field of ['decidedOn', 'recordedVia', 'evidenceRef'] as const) {
        if (!approval[field]) {
          ctx.addIssue({
            code: 'custom',
            path: [field],
            message: `A decision ("${approval.status}") must record ${field}.`,
          });
        }
      }
    }
    if (approval.status === 'approved-with-comments' && approval.conditions.length === 0 && !approval.comments) {
      ctx.addIssue({
        code: 'custom',
        path: ['conditions'],
        message: 'Record the conditions or comments attached to the approval.',
      });
    }
    if (approval.decidedOn && approval.decidedOn < approval.requestedOn) {
      ctx.addIssue({ code: 'custom', path: ['decidedOn'], message: 'decidedOn cannot precede requestedOn.' });
    }
    if (approval.dueOn && approval.dueOn < approval.requestedOn) {
      ctx.addIssue({ code: 'custom', path: ['dueOn'], message: 'dueOn cannot precede requestedOn.' });
    }
  });
export type Approval = z.infer<typeof approvalSchema>;
