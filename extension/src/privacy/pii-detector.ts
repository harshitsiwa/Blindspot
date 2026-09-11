import { PII_REGEX_PATTERNS } from './privacy-policy';

export interface PIIMatch {
  type: 'email' | 'phone' | 'ssn' | 'pan' | 'aadhaar' | 'credit_card' | 'jwt' | 'apiKey' | 'privateKey' | 'password' | 'secret';
  text: string;
  confidence: number;
  index: number;
}

export function detectPII(text: string): PIIMatch[] {
  if (!text || typeof text !== 'string') return [];

  const matches: PIIMatch[] = [];

  for (const [typeKey, pattern] of Object.entries(PII_REGEX_PATTERNS)) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      matches.push({
        type: typeKey as PIIMatch['type'],
        text: match[0],
        confidence: 0.95,
        index: match.index,
      });
    }
  }

  return matches;
}
