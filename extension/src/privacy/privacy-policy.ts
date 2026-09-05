/**
 * Privacy Policy definitions and pattern detectors for local browser Privacy Firewall.
 */

export const SENSITIVE_INPUT_TYPES = new Set(['password', 'email', 'tel']);

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
];

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
