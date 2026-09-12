import { BoundingBox, DetectionSource, EntityType, PrivacyDetection, PrivacyRegion } from '../shared/types';
import { OCRTextRegion } from '../vision/ocr-engine';
import { deterministicRedactor } from './redactor';
import { detectPIIWithContext } from './pii-detector';

export interface MultiSourceEvidencePayload {
  domDetections?: PrivacyDetection[];
  textDetections?: PrivacyDetection[];
  dynamicDetections?: PrivacyDetection[];
  ocrTextRegions?: OCRTextRegion[];
}

export class DOMVisionFusionEngine {
  /**
   * Fuses evidence across DOM, text nodes, dynamic mutations, and OCR visual text regions.
   * Merges overlapping evidence for the same entity and assigns deterministic placeholders.
   */
  public fuseEvidence(payload: MultiSourceEvidencePayload): PrivacyRegion[] {
    const rawDetections: PrivacyDetection[] = [];

    if (payload.domDetections) rawDetections.push(...payload.domDetections);
    if (payload.textDetections) rawDetections.push(...payload.textDetections);
    if (payload.dynamicDetections) rawDetections.push(...payload.dynamicDetections);

    // Process OCR text regions through local PII detector
    if (payload.ocrTextRegions && payload.ocrTextRegions.length > 0) {
      for (const ocrRegion of payload.ocrTextRegions) {
        const ocrDetections = detectPIIWithContext(ocrRegion.text, {
          source: 'ocr',
        });
        ocrDetections.forEach((det) => {
          det.region = ocrRegion.bbox;
          // Combine OCR confidence with PII detector confidence
          det.confidence = Math.min(1.0, det.confidence * ocrRegion.confidence);
          rawDetections.push(det);
        });
      }
    }

    const fusedRegions: PrivacyRegion[] = [];
    const entityGroups = new Map<string, PrivacyDetection[]>();

    // Group detections by normalized entity text value
    for (const det of rawDetections) {
      if (!det.text) continue;
      const key = `${det.type}:${det.text.trim().toLowerCase()}`;
      if (!entityGroups.has(key)) {
        entityGroups.set(key, []);
      }
      entityGroups.get(key)!.push(det);
    }

    let regionCounter = 1;

    for (const [, group] of entityGroups.entries()) {
      const first = group[0];
      const sources = Array.from(new Set(group.map((d) => d.source)));

      // Calculate combined evidence confidence score
      let combinedConfidence = Math.max(...group.map((d) => d.confidence));
      if (sources.length > 1) {
        // Multi-source confirmation boosts overall confidence
        combinedConfidence = Math.min(1.0, combinedConfidence + 0.05 * (sources.length - 1));
      }

      // Assign stable deterministic placeholder via DeterministicRedactor
      const category = this.mapEntityTypeToCategory(first.type);
      const placeholder = deterministicRedactor.getPlaceholder(first.text, category);

      // Resolve elementId and bounding box from available evidence
      const elementId = group.find((d) => d.elementId)?.elementId;
      const bbox: BoundingBox | undefined = group.find((d) => d.region)?.region;

      fusedRegions.push({
        id: `preg_${String(regionCounter++).padStart(3, '0')}`,
        type: first.type,
        sensitivity: first.sensitivity,
        confidence: Math.round(combinedConfidence * 100) / 100,
        source: sources as DetectionSource[],
        elementId,
        textSpan: first.start !== undefined && first.end !== undefined ? { start: first.start, end: first.end } : undefined,
        bbox,
        placeholder,
      });
    }

    return fusedRegions;
  }

  private mapEntityTypeToCategory(type: EntityType): string {
    switch (type) {
      case 'email':
        return 'EMAIL';
      case 'phone':
        return 'PHONE';
      case 'password':
        return 'PASSWORD';
      case 'credit_card':
        return 'CARD';
      case 'ssn':
        return 'SSN';
      case 'pan':
        return 'PAN';
      case 'aadhaar':
        return 'AADHAAR';
      case 'name':
        return 'PERSON';
      case 'address':
        return 'ADDRESS';
      case 'account_number':
        return 'ACCOUNT';
      default:
        return 'SECRET';
    }
  }
}

export const fusionEngine = new DOMVisionFusionEngine();
