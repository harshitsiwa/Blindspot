import { describe, test, expect } from 'vitest';
import { mockVisualAdapter, LocalModelVisualAdapter } from '../src/vision/ocr-engine';

describe('Workstream 3.4 — Visual Privacy Pipeline Infrastructure Tests', () => {
  test('1. MockVisualPrivacyAdapter correctly identifies as mock adapter', () => {
    expect(mockVisualAdapter.isMock).toBe(true);
    expect(mockVisualAdapter.id).toContain('mock');
  });

  test('2. Processes simulated OCR text regions deterministically', async () => {
    mockVisualAdapter.setSimulatedData(
      [
        {
          text: 'Account email: ocr.user@example.com',
          confidence: 0.92,
          bbox: { x: 10, y: 20, width: 200, height: 30 },
        },
      ],
      [
        {
          type: 'face',
          confidence: 0.88,
          bbox: { x: 300, y: 50, width: 80, height: 80 },
        },
      ]
    );

    const result = await mockVisualAdapter.processImage('data:image/png;base64,stub');
    expect(result.isMock).toBe(true);
    expect(result.textRegions.length).toBe(1);
    expect(result.textRegions[0].text).toContain('ocr.user@example.com');
    expect(result.visualRegions.length).toBe(1);
    expect(result.visualRegions[0].type).toBe('face');
  });

  test('3. LocalModelVisualAdapter identifies as non-mock adapter infrastructure', () => {
    const localAdapter = new LocalModelVisualAdapter();
    expect(localAdapter.isMock).toBe(false);
  });
});
