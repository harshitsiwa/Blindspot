/**
 * OCR Module Stub (Phase 1 Placeholder)
 * 
 * Future phases will integrate PP-OCRv6 Tiny / PP-OCRv5 Mobile ONNX models
 * running in WebGPU/WASM for local browser screen OCR.
 */

export interface OCRResult {
  text: string;
  bbox: { x: number; y: number; width: number; height: number };
  confidence: number;
}

export async function runLocalOCR(_imageData: ImageData | HTMLCanvasElement): Promise<OCRResult[]> {
  return [];
}
