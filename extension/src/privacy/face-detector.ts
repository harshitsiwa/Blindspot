/**
 * Face Detector Module Stub (Phase 1 Placeholder)
 * 
 * Future phases will integrate SCRFD-500M / SCRFD-1G ONNX models
 * running in WebGPU/WASM for local face obfuscation and blur redacting.
 */

export interface FaceDetectionBox {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
}

export async function detectFaces(_imageCanvas: HTMLCanvasElement): Promise<FaceDetectionBox[]> {
  return [];
}
