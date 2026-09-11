import { ViewportDimensions, VisualContextMeta } from '../shared/types';

export function getViewportDimensions(): ViewportDimensions {
  return {
    width: window.innerWidth || document.documentElement.clientWidth || 0,
    height: window.innerHeight || document.documentElement.clientHeight || 0,
  };
}

export async function captureVisualContext(includeScreenshot = false): Promise<VisualContextMeta> {
  const viewport = getViewportDimensions();

  const meta: VisualContextMeta = {
    available: true,
    viewportWidth: viewport.width,
    viewportHeight: viewport.height,
    screenshot: null,
  };

  if (includeScreenshot && typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
    try {
      const response = await new Promise<{ screenshot: string | null }>((resolve) => {
        chrome.runtime.sendMessage({ type: 'CAPTURE_VISUAL_TAB' }, (res) => {
          if (chrome.runtime.lastError || !res) {
            resolve({ screenshot: null });
          } else {
            resolve(res);
          }
        });
      });
      meta.screenshot = response.screenshot;
    } catch {
      meta.screenshot = null;
    }
  }

  return meta;
}
