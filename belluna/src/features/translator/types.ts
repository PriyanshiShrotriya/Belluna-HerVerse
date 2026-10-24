
export type Language = 'en' | 'hi';

export type TranslatorStatus =
  | 'ok'
  | 'emergency'
  | 'refused'
  | 'out_of_scope'
  | 'rate_limited'
  | 'error';

export type SafetyLevel = 'info' | 'caution' | 'urgent';

export type TranslatorTopic =
  | 'periods'
  | 'pcos'
  | 'endometriosis'
  | 'medicines'
  | 'reproductive'
  | 'general';

export interface TranslatorContext {
  avgCycleLength?: number;
  recentSymptoms?: string[];
}

export interface ExplainRequest {
  question: string;
  language: Language;
  topic?: TranslatorTopic;
  context?: TranslatorContext;
}

export interface GlossaryItem {
  term: string;
  meaning: string;
}

export interface TranslatorSource {
  id: string;
  title: string;
  publisher: string;
  url: string;
}

export interface SafetyMetadata {
  level: SafetyLevel;
  flags: string[];
}

export interface ExplainResponse {
  status: TranslatorStatus;
  language: Language;
  title?: string;
  summary?: string;
  key_points?: string[];
  what_you_can_do?: string[];
  see_a_doctor_if?: string[];
  glossary?: GlossaryItem[];
  sources?: TranslatorSource[];
  disclaimer: string;
  safety: SafetyMetadata;
  message?: string;
}
