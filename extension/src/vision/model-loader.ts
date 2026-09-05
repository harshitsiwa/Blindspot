/**
 * Vision Model Loader Stub (Phase 1 Placeholder)
 * 
 * Future phases will handle downloading, caching in IndexedDB, and initializing
 * ONNX Runtime Web sessions with WebGPU/WASM execution providers.
 */

export interface LoadedModelSession {
  name: string;
  backend: 'webgpu' | 'wasm';
  loaded: boolean;
}

export async function loadONNXModel(modelName: string): Promise<LoadedModelSession> {
  return {
    name: modelName,
    backend: 'wasm',
    loaded: true,
  };
}
