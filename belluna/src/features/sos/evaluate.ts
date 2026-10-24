// MOCK RULES — pending Member 1's content/sos-rules.json (SAF-7). Pure, deterministic, no LLM.
// Replace the RULES source in Phase 3; keep the evaluate() signature: answers -> { level, reasons }.
export type Level = 'emergency' | 'urgent' | 'selfcare';
export type Answers = Record<string, boolean>;
export const QUESTIONS = ['soak', 'faint', 'pain', 'fever', 'preg', 'pregbleed'] as const;
const EMERGENCY: string[] = ['soak', 'faint', 'fever', 'preg', 'pregbleed'];
const URGENT: string[] = ['pain'];

export function evaluate(a: Answers): { level: Level; reasons: string[] } {
  const em = EMERGENCY.filter((k) => a[k]);
  if (em.length) return { level: 'emergency', reasons: em };
  const ur = URGENT.filter((k) => a[k]);
  if (ur.length) return { level: 'urgent', reasons: ur };
  return { level: 'selfcare', reasons: [] };
}
