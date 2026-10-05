import { z } from 'zod';
import { budgetSchema, idSchema, isoDateSchema, specValue, statementSchema, textSchema } from './common';
import { APPROVAL_CHANNELS } from './approval';

export const AGE_GROUPS = ['child', 'teen', 'adult', 'senior'] as const;

export const householdMemberSchema = z.object({
  id: idSchema,
  /** Role in the household, not personal detail — e.g. "Client (primary)", "Parent", "Child". */
  role: textSchema,
  ageGroup: z.enum(AGE_GROUPS),
  needs: z.array(statementSchema),
});

export const clientSchema = z
  .object({
    id: idSchema,
    displayName: textSchema,
    contacts: z
      .array(
        z.object({
          name: textSchema,
          role: z.enum(['primary', 'decision-maker', 'household-member', 'representative']),
          email: z.email().optional(),
          phone: textSchema.optional(),
          preferredChannel: z.enum(APPROVAL_CHANNELS),
        }),
      )
      .min(1),
    household: z.object({
      members: z.array(householdMemberSchema).min(1),
      pets: z.array(textSchema),
      domesticHelp: specValue(z.enum(['none', 'part-time', 'full-time', 'live-in'])),
    }),
    lifestyle: z.array(statementSchema),
    preferences: z.object({
      styleKeywords: z.array(textSchema),
      likes: z.array(statementSchema),
      dislikes: z.array(statementSchema),
      colours: z.array(statementSchema),
      materials: z.array(statementSchema),
    }),
    /** Vastu, pooja space, footwear storage at the entrance, dietary separation in the kitchen, etc. */
    culturalConsiderations: z.array(statementSchema),
    accessibilityNeeds: z.array(statementSchema),
    budget: budgetSchema,
    timeline: z.object({
      targetCompletion: specValue(isoDateSchema),
      constraints: z.array(statementSchema),
    }),
    decisionMakers: z.array(textSchema).min(1),
    communication: z.object({
      languages: z.array(textSchema).min(1),
      availability: textSchema.optional(),
    }),
    intake: z.object({
      date: isoDateSchema,
      conductedBy: textSchema,
      method: z.enum(['in-person', 'video-call', 'phone', 'questionnaire']),
    }),
    openQuestions: z.array(statementSchema),
  })
  .superRefine((client, ctx) => {
    client.openQuestions.forEach((question, index) => {
      if (question.certainty === 'confirmed') {
        ctx.addIssue({
          code: 'custom',
          path: ['openQuestions', index, 'certainty'],
          message: 'An open question cannot be confirmed — move the answer into the relevant section.',
        });
      }
    });
  });
export type Client = z.infer<typeof clientSchema>;
