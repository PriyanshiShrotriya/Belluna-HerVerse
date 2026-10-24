export type ResponseStyle = 'en' | 'hi' | 'hinglish';

export interface DetectedLanguage {
  style: ResponseStyle;
  confidence: 'high' | 'low';
}

const hinglishSignals = new Set([
  'aane',
  'aata',
  'aati',
  'bahut',
  'dard',
  'hai',
  'hota',
  'kaise',
  'kyu',
  'kyun',
  'mein',
  'mere',
  'meri',
  'mujhe',
  'pehle',
  'pet',
  'se',
  'wala',
  'wali',
]);

const englishSignals = new Set([
  'about',
  'before',
  'can',
  'does',
  'get',
  'have',
  'how',
  'period',
  'periods',
  'the',
  'what',
  'why',
]);

export function detectQuestionLanguage(question: string, fallback: 'en' | 'hi'): DetectedLanguage {
  const text = question.trim();
  const tokens = text.toLowerCase().match(/[a-z]+/g) ?? [];
  const devanagariCount = (text.match(/[\u0900-\u097F]/gu) ?? []).length;
  const latinCount = (text.match(/[a-z]/gi) ?? []).length;

  if (devanagariCount >= 3 && devanagariCount >= latinCount) {
    return { style: 'hi', confidence: 'high' };
  }

  if (tokens.length < 3 || latinCount === 0) {
    return { style: fallback, confidence: 'low' };
  }

  const hinglishScore = tokens.filter((token) => hinglishSignals.has(token)).length;
  const englishScore = tokens.filter((token) => englishSignals.has(token)).length;

  if (hinglishScore >= 2 && hinglishScore > englishScore) {
    return { style: 'hinglish', confidence: 'high' };
  }

  if (englishScore >= 2 && englishScore >= hinglishScore) {
    return { style: 'en', confidence: 'high' };
  }

  return { style: fallback, confidence: 'low' };
}

export function responseLanguage(style: ResponseStyle): 'en' | 'hi' {
  return style === 'en' ? 'en' : 'hi';
}

export function hasExpectedResponseStyle(text: string, style: ResponseStyle): boolean {
  const hasDevanagari = /[\u0900-\u097F]/u.test(text);
  const words = text.toLowerCase().match(/[a-z]+/g) ?? [];
  const hinglishScore = words.filter((word) => hinglishSignals.has(word)).length;

  if (style === 'hi') {
    return hasDevanagari;
  }

  if (style === 'hinglish') {
    return !hasDevanagari && hinglishScore >= 2;
  }

  return !hasDevanagari;
}
