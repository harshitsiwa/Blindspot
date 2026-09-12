import { describe, test, expect, beforeEach } from 'vitest';
import { fusionEngine } from '../src/privacy/privacy-fusion';
import { deterministicRedactor } from '../src/privacy/redactor';

describe('Workstream 3.5 — DOM + Vision Fusion Tests', () => {
  beforeEach(() => {
    deterministicRedactor.reset();
  });

  test('1. Fuses DOM evidence and OCR evidence for same email into single PrivacyRegion', () => {
    const fused = fusionEngine.fuseEvidence({
      domDetections: [
        {
          type: 'email',
          sensitivity: 'SENSITIVE',
          confidence: 0.95,
          source: 'dom',
          text: 'alice@example.com',
          elementId: 'el_001',
        },
      ],
      ocrTextRegions: [
        {
          text: 'Contact email: alice@example.com',
          confidence: 0.90,
          bbox: { x: 50, y: 100, width: 150, height: 25 },
        },
      ],
    });

    expect(fused.length).toBe(1);
    const region = fused[0];
    expect(region.type).toBe('email');
    expect(region.source).toContain('dom');
    expect(region.source).toContain('ocr');
    expect(region.elementId).toBe('el_001');
    expect(region.bbox).toEqual({ x: 50, y: 100, width: 150, height: 25 });
    expect(region.placeholder).toBe('[EMAIL_1]');
  });

  test('2. Multi-source confirmation boosts confidence score', () => {
    const fused = fusionEngine.fuseEvidence({
      textDetections: [
        {
          type: 'phone',
          sensitivity: 'SENSITIVE',
          confidence: 0.90,
          source: 'text',
          text: '+1-555-019-2834',
        },
      ],
      ocrTextRegions: [
        {
          text: '+1-555-019-2834',
          confidence: 0.95,
          bbox: { x: 10, y: 10, width: 100, height: 20 },
        },
      ],
    });

    expect(fused[0].confidence).toBeGreaterThan(0.90);
  });
});
