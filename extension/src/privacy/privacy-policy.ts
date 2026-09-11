/**
 * Privacy Policy definitions and pattern detectors for local browser Privacy Firewall.
 */

export const SENSITIVE_INPUT_TYPES = new Set(['password', 'email', 'tel', 'card', 'secret']);

export const SENSITIVE_FIELD_PATTERNS = [
  /password/i,
  /passcode/i,
  /secret/i,
  /token/i,
  /email/i,
  /phone/i,
  /mobile/i,
  /ssn/i,
  /social-security/i,
  /aadhaar/i,
  /adhar/i,
  /pan/i,
  /card/i,
  /credit/i,
  /debit/i,
  /cvv/i,
  /cvc/i,
  /pin/i,
  /account/i,
  /routing/i,
  /dob/i,
  /birth/i,
  /auth/i,
  /api[_-]?key/i,
  /private[_-]?key/i,
  /bearer/i,
];

// Regex patterns for detecting raw PII & Secret values in arbitrary strings
export const PII_REGEX_PATTERNS = {
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi,
  phone: /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
  credit_card: /\b(?:\d[ -]*?){13,19}\b/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  pan: /\b[A-Z]{5}\d{4}[A-Z]\b/g,
  aadhaar: /\b\d{4}\s?\d{4}\s?\d{4}\b/g,
  jwt: /\beyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\b/g,
  apiKey: /\b(?:sk-[a-zA-Z0-9]{20,}|AKIA[0-9A-Z]{16}|ghp_[a-zA-Z0-9]{36}|[a-zA-Z0-9_]{32,})\b/g,
  privateKey: /-----BEGIN PRIVATE KEY-----[\s\S]*?-----END PRIVATE KEY-----/g,
};

/**
 * Privacy safe logging utility that strips potential raw PII before logging.
 */
export function privacyLog(message: string, meta?: Record<string, unknown>): void {
  const safeMeta = meta ? sanitizeMetaForLogging(meta) : '';
  console.log(`[Blindspot Privacy Firewall] ${message}`, safeMeta ? safeMeta : '');
}

function sanitizeMetaForLogging(meta: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(meta)) {
    if (typeof val === 'string') {
      if (SENSITIVE_FIELD_PATTERNS.some((p) => p.test(key))) {
        sanitized[key] = '[REDACTED_LOG_METADATA]';
      } else {
        sanitized[key] = val;
      }
    } else {
      sanitized[key] = val;
    }
  }
  return sanitized;
}

export function isFieldSensitive(
  type: string,
  name?: string,
  id?: string,
  autocomplete?: string,
  placeholder?: string,
  ariaLabel?: string
): boolean {
  if (SENSITIVE_INPUT_TYPES.has(type.toLowerCase())) {
    return true;
  }

  const combinedAttributes = `${name || ''} ${id || ''} ${autocomplete || ''} ${placeholder || ''} ${ariaLabel || ''}`;
  return SENSITIVE_FIELD_PATTERNS.some((pattern) => pattern.test(combinedAttributes));
}

export function getSanitizedValuePlaceholder(type: string, name?: string): string {
  const lowerType = type.toLowerCase();
  const lowerName = (name || '').toLowerCase();

  if (lowerType === 'password' || lowerName.includes('pass')) {
    return '[PASSWORD]';
  }
  if (lowerType === 'email' || lowerName.includes('email')) {
    return '[EMAIL]';
  }
  if (lowerType === 'tel' || lowerName.includes('phone') || lowerName.includes('mobile')) {
    return '[PHONE]';
  }
  if (lowerName.includes('card') || lowerName.includes('credit')) {
    return '[CREDIT_CARD]';
  }
  if (lowerName.includes('pan')) {
    return '[PAN_NUMBER]';
  }
  if (lowerName.includes('aadhaar') || lowerName.includes('adhar')) {
    return '[AADHAAR_NUMBER]';
  }

  return '[REDACTED]';
}
