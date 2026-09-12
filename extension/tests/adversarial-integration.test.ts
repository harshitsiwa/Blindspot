import { describe, test, expect, beforeEach } from 'vitest';
import { captureSanitizedContext } from '../src/context/context-pipeline';
import { deterministicRedactor } from '../src/privacy/redactor';
import { elementMapper } from '../src/content/element-mapper';
import { PSSR } from '../src/shared/types';

describe('Live Browser Integration Regression Tests — Adversarial PII Perception', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    deterministicRedactor.reset();
    elementMapper.reset();
  });

  test('1. Free-floating visible email (split across spans) and Bearer JWT token are perceived and sanitized into PSSR payload', async () => {
    document.title = 'Blindspot Demo — Adversarial Obfuscated PII';
    document.body.innerHTML = `
      <h1>Adversarial Test Target</h1>
      <div>
        Contact email: <span>alice.adversarial</span><span>@</span><span>security-test.org</span>
      </div>
      <div>
        Secret Bearer Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
      </div>
    `;

    const result = await captureSanitizedContext();
    expect(result.success).toBe(true);

    if (result.success) {
      // 1. Verify SanitizedContext text contains sanitized representations
      expect(result.context.text).toBeDefined();
      expect(result.context.text.some((t) => t.includes('[EMAIL_1]'))).toBe(true);
      expect(result.context.text.some((t) => t.includes('[SECRET_1]'))).toBe(true);

      // 2. Verify redaction_summary sensitiveCount reflects PII detections (non-zero)
      expect(result.context.redaction_summary?.sensitiveCount).toBeGreaterThanOrEqual(2);

      // 3. Simulate content/index.ts PSSR object construction
      const pssr: PSSR = {
        page: {
          title: result.context.page.title,
          url: result.context.page.url,
          viewport: result.context.viewport,
        },
        dom: result.context.elements.map((el) => ({
          id: el.id,
          type: el.type,
          role: el.role,
          label: el.label,
          text: el.text,
          value: el.value,
          bbox: el.rect,
          visible: el.visible,
          enabled: !el.disabled,
          sensitive: el.sensitive,
        })),
        text: result.context.text,
        visual_context: result.context.visual,
        redaction_summary: result.context.redaction_summary || {
          totalElements: result.context.elements.length,
          sensitiveCount: 0,
          redactedFields: [],
        },
        screenshot: result.context.visual.screenshot || null,
      };

      const serializedPSSR = JSON.stringify(pssr);

      // 4. Verify ZERO raw email or JWT token leaks in serialized PSSR transmission payload
      expect(serializedPSSR).not.toContain('alice.adversarial@security-test.org');
      expect(serializedPSSR).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');

      // 5. Verify presence of placeholders in PSSR text array
      expect(serializedPSSR).toContain('[EMAIL_1]');
      expect(serializedPSSR).toContain('[SECRET_1]');
      expect(pssr.text).toBeDefined();
      expect(pssr.text?.length).toBeGreaterThan(0);
    }
  });
});
