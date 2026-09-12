import { BoundingBox } from '../shared/types';

export interface OCRTextRegion {
  text: string;
  confidence: number;
  bbox: BoundingBox;
}

export interface VisualRegion {
  type: 'face' | 'text' | 'sensitive_region';
  confidence: number;
  bbox: BoundingBox;
  text?: string;
}

export interface VisualPrivacyResult {
  textRegions: OCRTextRegion[];
  visualRegions: VisualRegion[];
  isMock: boolean;
  adapterId: string;
}

/**
 * Adapter interface for visual OCR & sensitive region perception models.
 * Decouples actual local ML execution providers from privacy pipeline logic.
 */
export interface VisualPrivacyAdapter {
  id: string;
  isMock: boolean;
  processImage(imageSource: string | HTMLCanvasElement): Promise<VisualPrivacyResult>;
}

/**
 * Deterministic Mock Adapter used for automated test suites and synthetic page verification.
 * EXPLICIT NOTE: This is a deterministic testing adapter, NOT a live computer vision neural network.
 */
export class MockVisualPrivacyAdapter implements VisualPrivacyAdapter {
  public id = 'mock-ocr-adapter-v1';
  public isMock = true;

  private simulatedTextRegions: OCRTextRegion[] = [];
  private simulatedVisualRegions: VisualRegion[] = [];

  public setSimulatedData(textRegions: OCRTextRegion[], visualRegions: VisualRegion[] = []): void {
    this.simulatedTextRegions = textRegions;
    this.simulatedVisualRegions = visualRegions;
  }

  public async processImage(_imageSource: string | HTMLCanvasElement): Promise<VisualPrivacyResult> {
    return {
      textRegions: [...this.simulatedTextRegions],
      visualRegions: [...this.simulatedVisualRegions],
      isMock: true,
      adapterId: this.id,
    };
  }
}

/**
 * Local Model Adapter Infrastructure Stub.
 * EXPLICIT NOTE: Infrastructure setup for local ONNX WebGPU/WASM runtime adapters.
 */
export class LocalModelVisualAdapter implements VisualPrivacyAdapter {
  public id = 'onnx-wasm-local-adapter';
  public isMock = false;

  public async processImage(_imageSource: string | HTMLCanvasElement): Promise<VisualPrivacyResult> {
    // Model inference stub — returns empty regions until local weights are loaded
    return {
      textRegions: [],
      visualRegions: [],
      isMock: false,
      adapterId: this.id,
    };
  }
}

export const mockVisualAdapter = new MockVisualPrivacyAdapter();
export const activeVisualAdapter: VisualPrivacyAdapter = mockVisualAdapter;
