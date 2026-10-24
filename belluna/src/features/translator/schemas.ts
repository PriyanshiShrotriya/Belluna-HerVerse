
import { z } from 'zod';

export const languageSchema = z.enum(['en', 'hi']);

export const translatorTopicSchema = z.enum([
  'periods',
  'pcos',
  'endometriosis',
  'medicines',
  'reproductive',
  'general',
]);

export const translatorContextSchema = z
  .object({
    avgCycleLength: z.number().int().min(15).max(60).optional(),
    recentSymptoms: z.array(z.string().trim().min(1).max(100)).max(20).optional(),
  })
  .strict();

export const explainRequestSchema = z
  .object({
    question: z.string().trim().min(1).max(500),
    language: languageSchema,
    topic: translatorTopicSchema.optional(),
    context: translatorContextSchema.optional(),
  })
  .strict();

export const glossaryItemSchema = z
  .object({
    term: z.string().trim().min(1).max(100),
    meaning: z.string().trim().min(1).max(500),
  })
  .strict();

export const translatorSourceSchema = z
  .object({
    id: z.string().trim().min(1).max(100),
    title: z.string().trim().min(1).max(200),
    publisher: z.string().trim().min(1).max(150),
    url: z.string().url(),
  })
  .strict();

export const safetyMetadataSchema = z
  .object({
    level: z.enum(['info', 'caution', 'urgent']),
    flags: z.array(z.string().trim().min(1).max(100)).max(20),
  })
  .strict();

export const explainResponseSchema = z
  .object({
    status: z.enum([
      'ok',
      'emergency',
      'refused',
      'out_of_scope',
      'rate_limited',
      'error',
    ]),
    language: languageSchema,
    title: z.string().max(200).optional(),
    summary: z.string().max(2000).optional(),
    key_points: z.array(z.string().min(1).max(500)).min(3).max(6).optional(),
    what_you_can_do: z.array(z.string().min(1).max(500)).max(10).optional(),
    see_a_doctor_if: z.array(z.string().min(1).max(500)).max(10).optional(),
    glossary: z.array(glossaryItemSchema).max(20).optional(),
    sources: z.array(translatorSourceSchema).max(10).optional(),
    disclaimer: z.string().trim().min(1).max(1000),
    safety: safetyMetadataSchema,
    message: z.string().max(1000).optional(),
  })
  .strict();

export type ValidatedExplainRequest = z.infer<typeof explainRequestSchema>;
export type ValidatedExplainResponse = z.infer<typeof explainResponseSchema>;
