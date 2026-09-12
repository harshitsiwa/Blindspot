import { describe, test, expect } from 'vitest';
import { detectPII, detectPIIWithContext } from '../src/privacy/pii-detector';
import { getSensitivityLevelForEntity } from '../src/privacy/privacy-policy';

describe('Workstream 3.1 — Generalized Privacy Detection Core & Taxonomy Tests', () => {
  test('1. Entity type maps to appropriate SensitivityLevel', () => {
    expect(getSensitivityLevelForEntity('password')).toBe('CREDENTIAL');
    expect(getSensitivityLevelForEntity('api_key')).toBe('CREDENTIAL');
    expect(getSensitivityLevelForEntity('ssn')).toBe('HIGHLY_SENSITIVE');
    expect(getSensitivityLevelForEntity('aadhaar')).toBe('HIGHLY_SENSITIVE');
    expect(getSensitivityLevelForEntity('pan')).toBe('HIGHLY_SENSITIVE');
    expect(getSensitivityLevelForEntity('credit_card')).toBe('HIGHLY_SENSITIVE');
    expect(getSensitivityLevelForEntity('email')).toBe('SENSITIVE');
    expect(getSensitivityLevelForEntity('phone')).toBe('SENSITIVE');
    expect(getSensitivityLevelForEntity('name')).toBe('PERSONAL');
  });

  test('2. detectPIIWithContext extracts structured PrivacyDetection entries', () => {
    const text = 'User email is alice@example.com and phone is +1-555-019-2834';
    const detections = detectPIIWithContext(text, { source: 'text' });

    expect(detections.length).toBeGreaterThanOrEqual(2);

    const emailDetection = detections.find((d) => d.type === 'email');
    expect(emailDetection).toBeDefined();
    expect(emailDetection?.sensitivity).toBe('SENSITIVE');
    expect(emailDetection?.confidence).toBeGreaterThanOrEqual(0.9);

    const phoneDetection = detections.find((d) => d.type === 'phone');
    expect(phoneDetection).toBeDefined();
    expect(phoneDetection?.sensitivity).toBe('SENSITIVE');
  });

  test('3. Contextual evidence boosts Aadhaar confidence when label matches', () => {
    const rawNumber = '4821 9374 1234';

    const withContext = detectPIIWithContext(rawNumber, {
      label: 'Aadhaar Number',
      fieldName: 'aadhaar_id',
    });

    const aadhaarDet = withContext.find((d) => d.type === 'aadhaar');
    expect(aadhaarDet).toBeDefined();
    expect(aadhaarDet?.confidence).toBe(0.98);
  });

  test('4. False positive mitigation suppresses order ID / numeric strings from Aadhaar/Phone classification', () => {
    const orderId = 'Order ID: 4821 9374 1234';

    const detections = detectPIIWithContext(orderId, {
      label: 'Order Reference',
      surroundingText: 'Order ID: 4821 9374 1234',
    });

    // Aadhaar confidence should be penalized (< 0.5) and filtered out
    const aadhaarDet = detections.find((d) => d.type === 'aadhaar');
    expect(aadhaarDet).toBeUndefined();
  });

  test('5. Backward compatibility for detectPII() returns PIIMatch array', () => {
    const matches = detectPII('Contact dev@blindspot.local or sk-12345678901234567890');
    expect(matches.length).toBeGreaterThanOrEqual(2);
    expect(matches.some((m) => m.type === 'email')).toBe(true);
    expect(matches.some((m) => m.type === 'apiKey')).toBe(true);
  });
});
