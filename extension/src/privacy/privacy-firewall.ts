import { detectPII } from './pii-detector';
import { privacyLog } from './privacy-policy';

export interface PrivacyScanResult {
  safe: boolean;
  violations: string[];
}

/**
 * Runs a final, fail-closed privacy scan on the serialized outgoing payload string.
 * Checks for both unredacted PII patterns and raw secret values from local mapping table.
 */
export function runFinalPrivacyScan(
  payload: unknown,
  localValueMap?: Map<string, string>
): PrivacyScanResult {
  const violations: string[] = [];
  const serialized = typeof payload === 'string' ? payload : JSON.stringify(payload);

  // 1. Check for raw PII regex pattern matches in serialized payload
  const piiMatches = detectPII(serialized);
  for (const match of piiMatches) {
    violations.push(
      `Detected unredacted raw ${match.type.toUpperCase()}: "${match.text.substring(0, 4)}..."`
    );
  }

  // 2. Check if any raw secret value from local browser mapping is present in serialized output
  if (localValueMap && localValueMap.size > 0) {
    for (const [rawValue, placeholder] of localValueMap.entries()) {
      if (rawValue && rawValue.trim().length > 2) {
        if (serialized.includes(rawValue)) {
          violations.push(
            `Detected raw secret value mapped to placeholder ${placeholder} in outgoing payload!`
          );
        }
      }
    }
  }

  const safe = violations.length === 0;

  if (!safe) {
    privacyLog(`[PRIVACY FIREWALL VIOLATION] Transmission BLOCKED! Violations:`, {
      count: violations.length,
      violations,
    });
  } else {
    privacyLog(`[PRIVACY FIREWALL] Context verification PASSED. Safe for transmission.`);
  }

  return {
    safe,
    violations,
  };
}
