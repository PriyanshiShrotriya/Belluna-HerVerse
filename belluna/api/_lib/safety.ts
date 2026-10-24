import type { ExplainResponse, Language } from '../../src/features/translator/types';
import type { ResponseStyle } from './language';

export type SafetyDecision =
  | { kind: 'emergency'; flag: string }
  | { kind: 'refused'; flag: string }
  | { kind: 'out_of_scope'; flag: string }
  | { kind: 'allow' };

const emergencyResponse = {
  en: {
    title: 'Please get urgent help now',
    message: 'This may be an emergency. Call 112 or your local emergency number now, or go to the nearest emergency department. If possible, stay with someone you trust.',
    what_you_can_do: ['Call 112 or local emergency medical services now.'],
    see_a_doctor_if: ['Get immediate medical help for faintness, severe bleeding, or thoughts of self-harm.'],
  },
  hi: {
    title: 'कृपया अभी तुरंत मदद लें',
    message: 'यह आपात स्थिति हो सकती है। अभी 112 या अपने स्थानीय आपातकालीन नंबर पर कॉल करें, या निकटतम आपातकालीन विभाग जाएँ। संभव हो तो किसी भरोसेमंद व्यक्ति के साथ रहें।',
    what_you_can_do: ['अभी 112 या स्थानीय आपातकालीन चिकित्सा सेवा को कॉल करें।'],
    see_a_doctor_if: ['बेहोशी जैसा लगना, बहुत अधिक रक्तस्राव या खुद को नुकसान पहुँचाने के विचार होने पर तुरंत चिकित्सा सहायता लें।'],
  },
} as const;

const refusalResponse = {
  en: {
    title: 'I cannot provide that advice',
    message: 'I cannot diagnose a condition, provide medication doses, or give instructions for ending a pregnancy at home. A qualified doctor or pharmacist can help you choose safe next steps.',
    what_you_can_do: ['Write down your symptoms and questions and discuss them with a qualified doctor or pharmacist.'],
    see_a_doctor_if: ['Seek medical care if symptoms are severe, worsening, or worrying you.'],
  },
  hi: {
    title: 'मैं इस सलाह को उपलब्ध नहीं करा सकता',
    message: 'मैं किसी बीमारी का निदान, दवा की मात्रा या घर पर गर्भावस्था समाप्त करने के निर्देश नहीं दे सकता। सुरक्षित अगले कदमों के लिए योग्य डॉक्टर या फार्मासिस्ट से बात करें।',
    what_you_can_do: ['अपने लक्षण और सवाल लिखकर योग्य डॉक्टर या फार्मासिस्ट से बात करें।'],
    see_a_doctor_if: ['लक्षण गंभीर हों, बढ़ रहे हों या आपको चिंता हो तो चिकित्सा सहायता लें।'],
  },
} as const;

const injectionResponse = {
  en: {
    title: 'I can help with health education',
    message: 'I cannot reveal private instructions, keys, or internal rules. Please ask a clear health-education question.',
  },
  hi: {
    title: 'मैं स्वास्थ्य शिक्षा में मदद कर सकता हूँ',
    message: 'मैं निजी निर्देश, कुंजी या आंतरिक नियम साझा नहीं कर सकता। कृपया स्वास्थ्य शिक्षा से जुड़ा स्पष्ट सवाल पूछें।',
  },
} as const;

const outOfScopeResponse = {
  en: {
    title: 'This question is outside Belluna’s health scope',
    message: 'I can help explain women’s health topics in simple language. Please ask a health-education question.',
  },
  hi: {
    title: 'यह सवाल Belluna के स्वास्थ्य दायरे से बाहर है',
    message: 'मैं महिलाओं के स्वास्थ्य विषयों को सरल भाषा में समझाने में मदद कर सकता हूँ। कृपया स्वास्थ्य शिक्षा से जुड़ा सवाल पूछें।',
  },
} as const;

const disclaimer = {
  en: 'This is general health information, not a diagnosis or a substitute for a doctor.',
  hi: 'यह सामान्य स्वास्थ्य जानकारी है। यह निदान नहीं है और डॉक्टर की सलाह का विकल्प नहीं है।',
} as const;

const hinglishDisclaimer = 'Yeh general health information hai. Yeh diagnosis nahi hai aur doctor ki salah ka badal nahi hai.';

function hasAny(text: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(text));
}

export function screenQuestion(question: string): SafetyDecision {
  const text = question.trim().toLowerCase().replace(/\s+/g, ' ');

  const heavyBleeding = hasAny(text, [
    /soak(?:ing)? .*?(?:pad|tampon).*?(?:every|each) hour/,
    /(?:pad|tampon).*?(?:every|each) hour.*?(?:soak|flood)/,
    /हर घंटे.*(?:पैड|टैम्पोन).*रक्त/,
  ]);
  const faintness = hasAny(text, [
    /\b(?:faint|fainted|fainting|dizzy|dizziness|lightheaded)\b/,
    /बेहोश|चक्कर|बेहोशी/,
  ]);
  const selfHarm = hasAny(text, [
    /\b(?:kill myself|end my life|hurt myself|self[- ]?harm|suicid(?:e|al))\b/,
    /खुद को नुकसान|आत्महत्या|जीवन समाप्त/,
  ]);

  if ((heavyBleeding && faintness) || selfHarm) {
    return { kind: 'emergency', flag: selfHarm ? 'self_harm' : 'heavy_bleeding_with_faintness' };
  }

  if (hasAny(text, [
    /ignore (?:all )?(?:your|the) (?:rules|instructions)/,
    /reveal|show|print| disclose.*(?:system prompt|developer message|api key|secret)/,
    /system prompt|developer message|api key|secret key/,
    /नियमों को नजरअंदाज|सिस्टम प्रॉम्प्ट|एपीआई कुंजी/,
  ])) {
    return { kind: 'refused', flag: 'prompt_injection' };
  }

  const pregnancy = hasAny(text, [/\bpregnan(?:t|cy)\b/, /गर्भवती|गर्भावस्था/]);
  const homeInduction = hasAny(text, [
    /\b(?:at home|home remedy|on my own)\b/,
    /घर पर|अपने आप/,
  ]);
  const endingPregnancy = hasAny(text, [
    /\b(?:end|terminate|abort)\b.*\b(?:pregnan|pregnancy)\b/,
    /\b(?:pregnan|pregnancy)\b.*\b(?:end|terminate|abort)\b/,
    /गर्भावस्था.*(?:समाप्त|गिराना|अबॉर्शन)/,
  ]);

  if (pregnancy && homeInduction && endingPregnancy) {
    return { kind: 'refused', flag: 'pregnancy_self_induction' };
  }

  if (hasAny(text, [
    /\b(?:what|which) (?:is the )?dose\b/,
    /\bhow much\b.*\b(?:take|tablet|medicine|medication)\b/,
    /\b(?:dosage|mg|milligrams?|tablets?|pills?)\b/,
    /कितनी मात्रा|कितनी गोली|डोज|मिलीग्राम/,
  ])) {
    return { kind: 'refused', flag: 'medication_dosing' };
  }

  if (hasAny(text, [
    /\bdo i have\b/,
    /\b(?:diagnose|diagnosis|am i suffering from)\b/,
    /क्या मुझे.*(?:है|रोग|बीमारी)/,
  ])) {
    return { kind: 'refused', flag: 'diagnosis_request' };
  }

  if (hasAny(text, [
    /\b(?:stock|stocks|share price|crypto|bitcoin|tax return|weather forecast)\b/,
    /\b(?:write|debug|compile) (?:a|the)? code\b/,
    /\b(?:football|cricket) score\b/,
    /\b(?:capital of|president of|prime minister of|population of)\b/,
    /\b(?:history of|recipe for|lyrics to|movie review|book summary)\b/,
    /\b(?:flight|hotel|travel|restaurant) recommendations?\b/,
    /शेयर बाजार|मौसम का पूर्वानुमान|कोड लिखो|फ्रांस की राजधानी|देश की राजधानी|जनसंख्या/,
  ])) {
    return { kind: 'out_of_scope', flag: 'outside_health_scope' };
  }

  return { kind: 'allow' };
}

export function createSafetyResponse(
  language: Language,
  decision: Exclude<SafetyDecision, { kind: 'allow' }>,
  style: ResponseStyle = language,
): ExplainResponse {
  if (decision.kind === 'emergency') {
    const copy = style === 'hinglish'
      ? {
        title: 'Abhi turant madad lein',
        message: 'Yeh emergency ho sakti hai. Abhi 112 ya local emergency medical services ko call karein, ya nearest emergency department jayein. Mumkin ho to kisi trusted person ke saath rahen.',
        what_you_can_do: ['Abhi 112 ya local emergency medical services ko call karein.'],
        see_a_doctor_if: ['Faintness, bahut zyada bleeding, ya khud ko nuksan pahunchane ke thoughts hon to turant medical help lein.'],
      }
      : emergencyResponse[language];
    return {
      status: 'emergency',
      language,
      title: copy.title,
      message: copy.message,
      what_you_can_do: [...copy.what_you_can_do],
      see_a_doctor_if: [...copy.see_a_doctor_if],
      disclaimer: style === 'hinglish' ? hinglishDisclaimer : disclaimer[language],
      safety: { level: 'urgent', flags: [decision.flag] },
      sources: [],
    };
  }

  if (decision.kind === 'refused') {
    const copy = style === 'hinglish'
      ? {
        title: 'Main yeh salah provide nahi kar sakta',
        message: decision.flag === 'prompt_injection'
          ? 'Main private instructions, keys, ya internal rules share nahi kar sakta. Kripya health-education ka clear question poochein.'
          : 'Main kisi condition ka diagnosis, medicine ki dose, ya ghar par pregnancy end karne ke instructions nahi de sakta. Safe next steps ke liye qualified doctor ya pharmacist se baat karein.',
        what_you_can_do: ['Apne symptoms aur questions likhkar qualified doctor ya pharmacist se discuss karein.'],
        see_a_doctor_if: ['Symptoms severe hon, badh rahe hon, ya aapko chinta ho to medical care lein.'],
      }
      : decision.flag === 'prompt_injection'
      ? injectionResponse[language]
      : refusalResponse[language];
    return {
      status: 'refused',
      language,
      title: copy.title,
      message: copy.message,
      ...('what_you_can_do' in copy ? {
        what_you_can_do: [...copy.what_you_can_do],
        see_a_doctor_if: [...copy.see_a_doctor_if],
      } : {}),
      disclaimer: style === 'hinglish' ? hinglishDisclaimer : disclaimer[language],
      safety: { level: 'caution', flags: [decision.flag] },
      sources: [],
    };
  }

  const copy = style === 'hinglish'
    ? {
      title: 'Yeh question Belluna ke health scope se bahar hai',
      message: 'Main women’s health topics ko simple language mein samjhane mein help kar sakta hoon. Kripya health-education ka question poochein.',
    }
    : outOfScopeResponse[language];
  return {
    status: 'out_of_scope',
    language,
    title: copy.title,
    message: copy.message,
    disclaimer: style === 'hinglish' ? hinglishDisclaimer : disclaimer[language],
    safety: { level: 'info', flags: [decision.flag] },
    sources: [],
  };
}
