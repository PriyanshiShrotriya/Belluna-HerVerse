import { describe, expect, it } from 'vitest';
import {
  detectQuestionLanguage,
  hasExpectedResponseStyle,
} from '../../api/_lib/language';

describe('translator question language detection', () => {
  it('detects ordinary English', () => {
    expect(detectQuestionLanguage('Why do I get cramps before my period?', 'hi')).toMatchObject({
      style: 'en',
      confidence: 'high',
    });
  });

  it('detects Roman-script Hinglish', () => {
    expect(detectQuestionLanguage('Mere periods aane se pehle pet mein dard kyun hota hai?', 'en')).toMatchObject({
      style: 'hinglish',
      confidence: 'high',
    });
  });

  it('detects Devanagari Hindi', () => {
    expect(detectQuestionLanguage('पीरियड्स आने से पहले पेट में दर्द क्यों होता है?', 'en')).toMatchObject({
      style: 'hi',
      confidence: 'high',
    });
  });

  it('uses the selected language for ambiguous short input', () => {
    expect(detectQuestionLanguage('Help me', 'hi')).toEqual({ style: 'hi', confidence: 'low' });
  });

  it('does not accept ordinary English as Hinglish', () => {
    expect(hasExpectedResponseStyle('Mild cramps can happen before a period.', 'hinglish')).toBe(false);
    expect(hasExpectedResponseStyle('Periods se pehle halka dard ho sakta hai.', 'hinglish')).toBe(true);
  });
});
