import { DeterministicRedactor } from '../privacy/redactor';
import { SENSITIVE_FIELD_PATTERNS } from '../privacy/privacy-policy';

export function sanitizeUrl(
  urlStr: string,
  redactor?: DeterministicRedactor
): string {
  if (!urlStr || typeof urlStr !== 'string') return urlStr;

  try {
    const urlObj = new URL(urlStr);
    const searchParams = urlObj.searchParams;

    let modified = false;
    for (const [key, val] of Array.from(searchParams.entries())) {
      const isSensitiveKey = SENSITIVE_FIELD_PATTERNS.some((p) => p.test(key));
      const isSensitiveVal = val.length > 8 && /[A-Za-z0-9_-]{12,}/.test(val);

      if (isSensitiveKey || isSensitiveVal) {
        const placeholder = redactor
          ? redactor.getPlaceholder(val, isSensitiveKey ? key : 'SECRET')
          : `[SECRET]`;
        searchParams.set(key, placeholder);
        modified = true;
      }
    }

    if (modified) {
      urlObj.search = searchParams.toString();
    }

    const sanitizedStr = urlObj.toString();
    return redactor ? redactor.redactText(sanitizedStr) : sanitizedStr;
  } catch {
    // If invalid URL, run direct pattern redaction
    return redactor ? redactor.redactText(urlStr) : urlStr;
  }
}
