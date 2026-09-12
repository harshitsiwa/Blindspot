import { PII_REGEX_PATTERNS, getSensitivityLevelForEntity } from './privacy-policy';
import { EntityType, PrivacyDetection, SensitivityLevel } from '../shared/types';

export interface PIIMatch {
  type: 'email' | 'phone' | 'ssn' | 'pan' | 'aadhaar' | 'credit_card' | 'jwt' | 'apiKey' | 'privateKey' | 'password' | 'secret';
  text: string;
  confidence: number;
  index: number;
}

export interface PIIContextOptions {
  label?: string;
  fieldType?: string;
  fieldName?: string;
  placeholder?: string;
  ariaLabel?: string;
  surroundingText?: string;
  source?: 'dom' | 'text' | 'ocr' | 'visual';
  elementId?: string;
}

export function mapLegacyPIITypeToEntity(type: string): EntityType {
  switch (type) {
    case 'email':
      return 'email';
    case 'phone':
      return 'phone';
    case 'ssn':
      return 'ssn';
    case 'pan':
      return 'pan';
    case 'aadhaar':
      return 'aadhaar';
    case 'credit_card':
      return 'credit_card';
    case 'jwt':
      return 'jwt';
    case 'apiKey':
    case 'api_key':
      return 'api_key';
    case 'privateKey':
    case 'private_key':
      return 'private_key';
    case 'password':
      return 'password';
    default:
      return 'secret';
  }
}

export function detectPII(text: string): PIIMatch[] {
  if (!text || typeof text !== 'string') return [];

  const detections = detectPIIWithContext(text);
  return detections.map((det) => ({
    type: (det.type === 'api_key' ? 'apiKey' : det.type === 'private_key' ? 'privateKey' : det.type) as PIIMatch['type'],
    text: det.text,
    confidence: det.confidence,
    index: det.start ?? 0,
  }));
}

export function detectPIIWithContext(
  text: string,
  contextOptions: PIIContextOptions = {}
): PrivacyDetection[] {
  if (!text || typeof text !== 'string') return [];

  const detections: PrivacyDetection[] = [];
  const source = contextOptions.source || 'text';
  const combinedContext = `${contextOptions.label || ''} ${contextOptions.fieldName || ''} ${contextOptions.placeholder || ''} ${contextOptions.ariaLabel || ''} ${contextOptions.surroundingText || ''}`.toLowerCase();

  for (const [typeKey, pattern] of Object.entries(PII_REGEX_PATTERNS)) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const matchedText = match[0];
      const entityType = mapLegacyPIITypeToEntity(typeKey);
      const evidence: string[] = [`regex_pattern:${typeKey}`];

      let confidence = 0.85;

      // Contextual evidence evaluation & false positive mitigation
      if (entityType === 'aadhaar') {
        if (/aadhaar|adhar|uidai/i.test(combinedContext)) {
          confidence = 0.98;
          evidence.push('context_keyword:aadhaar');
        } else if (/order|invoice|ref|zip|postcode|sku|item|product|track/i.test(combinedContext)) {
          confidence = 0.35;
          evidence.push('false_positive_hint:order_id');
        }
      } else if (entityType === 'pan') {
        if (/pan|tax|income|gov/i.test(combinedContext)) {
          confidence = 0.98;
          evidence.push('context_keyword:pan');
        }
      } else if (entityType === 'ssn') {
        if (/ssn|social\s*security/i.test(combinedContext)) {
          confidence = 0.98;
          evidence.push('context_keyword:ssn');
        }
      } else if (entityType === 'email') {
        if (matchedText.includes('@')) {
          confidence = 0.95;
        }
      } else if (entityType === 'phone') {
        if (/phone|mobile|tel|contact|call/i.test(combinedContext)) {
          confidence = 0.95;
          evidence.push('context_keyword:phone');
        } else if (/order|invoice|price|amount|\$/i.test(combinedContext)) {
          confidence = 0.40;
          evidence.push('false_positive_hint:numeric');
        }
      } else if (entityType === 'credit_card') {
        if (/card|credit|debit|visa|mastercard|payment/i.test(combinedContext)) {
          confidence = 0.98;
          evidence.push('context_keyword:credit_card');
        }
      } else if (entityType === 'jwt' || entityType === 'api_key' || entityType === 'private_key') {
        confidence = 0.99;
        evidence.push('secret_entropy_match');
      }

      if (confidence >= 0.5) {
        const sensitivity: SensitivityLevel = getSensitivityLevelForEntity(entityType);
        detections.push({
          type: entityType,
          sensitivity,
          confidence: Math.min(1.0, Math.max(0.0, confidence)),
          source,
          text: matchedText,
          start: match.index,
          end: match.index + matchedText.length,
          elementId: contextOptions.elementId,
          evidence,
        });
      }
    }
  }

  return detections;
}
