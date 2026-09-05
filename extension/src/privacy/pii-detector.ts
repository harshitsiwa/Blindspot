/**
 * PII Detector Module Stub (Phase 1 Placeholder)
 * 
 * Future phases will integrate ONNX/WebGPU local ML models for advanced NER,
 * Regex-based document/financial pattern detection, and DOM semantic analysis.
 */

export interface PIIMatch {
  type: 'email' | 'phone' | 'ssn' | 'pan' | 'aadhaar' | 'credit_card' | 'name' | 'address';
  text: string;
  confidence: number;
}

export async function detectPII(_text: string): Promise<PIIMatch[]> {
  // Phase 1 stub returning empty matches
  return [];
}
