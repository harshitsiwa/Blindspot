import { describe, test, expect, beforeEach } from 'vitest';
import { captureSanitizedContext } from '../src/context/context-pipeline';
import { deterministicRedactor } from '../src/privacy/redactor';

describe('Workstream 3.6 — Firewall Upgrade & Request-Boundary Protection Tests', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    deterministicRedactor.reset();
  });

  test('1. End-to-end request boundary test: Serialized outgoing payload contains ZERO raw PII', async () => {
    document.title = 'User Profile & Payment';
    document.body.innerHTML = `
      <form>
        <label for="email">Email</label>
        <input type="email" id="email" value="user.boundary@private.org" />
        <label for="phone">Phone</label>
        <input type="tel" id="phone" value="+91 9876543210" />
        <label for="card">Credit Card</label>
        <input type="text" id="card" name="card" value="4532 0123 4567 8901" />
        <label for="pan">PAN</label>
        <input type="text" id="pan" name="pan_id" value="ABCDE1234F" />
        <label for="key">API Secret</label>
        <input type="password" id="key" value="sk-live99887766554433221100" />
      </form>
      <div>Contact support free text: alice.support@company.com</div>
    `;

    const result = await captureSanitizedContext();
    expect(result.success).toBe(true);

    if (result.success) {
      const payloadStr = JSON.stringify(result.context);

      // Verify zero raw sensitive values pass through the request boundary
      expect(payloadStr).not.toContain('user.boundary@private.org');
      expect(payloadStr).not.toContain('+91 9876543210');
      expect(payloadStr).not.toContain('4532 0123 4567 8901');
      expect(payloadStr).not.toContain('ABCDE1234F');
      expect(payloadStr).not.toContain('sk-live99887766554433221100');
      expect(payloadStr).not.toContain('alice.support@company.com');

      // Verify presence of deterministic placeholders
      expect(payloadStr).toContain('[EMAIL_1]');
      expect(payloadStr).toContain('[PHONE_1]');
      expect(payloadStr).toContain('[CARD_1]');
      expect(payloadStr).toContain('[PAN_1]');
      expect(payloadStr).toContain('[PASSWORD_1]');
      expect(payloadStr).toContain('[EMAIL_2]');
    }
  });

  test('2. Request boundary test: Government IDs (SSN & Aadhaar) and JWT tokens are sanitized prior to serialization', async () => {
    document.body.innerHTML = `
      <div id="gov-info">
        <p>Tax SSN: 987-65-4321</p>
        <p>Aadhaar Card: 4821 9374 1234</p>
        <p>Auth Header: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c</p>
      </div>
    `;

    const result = await captureSanitizedContext();
    expect(result.success).toBe(true);

    if (result.success) {
      const payloadStr = JSON.stringify(result.context);
      expect(payloadStr).not.toContain('987-65-4321');
      expect(payloadStr).not.toContain('4821 9374 1234');
      expect(payloadStr).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
    }
  });

  test('3. Firewall fails closed and blocks payload when raw PII leak is injected', async () => {
    document.body.innerHTML = `<input type="text" id="username" value="john_doe" />`;

    const result = await captureSanitizedContext({ injectLeakForTest: true });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.blocked).toBe(true);
      expect(result.reason).toBe('privacy_violation');
      expect(result.violations?.length).toBeGreaterThan(0);
    }
  });
});
