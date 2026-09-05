import { analyzeDOM } from './dom-analyzer';
import { executeAction } from './action-executor';
import { sanitizeDOMContext } from '../privacy/sanitizer';
import { privacyLog } from '../privacy/privacy-policy';

privacyLog('Content script initialized on host page.');

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'ANALYZE_PAGE') {
    try {
      const rawContext = analyzeDOM();
      const pssrPayload = sanitizeDOMContext(rawContext);
      sendResponse({ status: 'ok', pssr: pssrPayload, rawCount: rawContext.elements.length });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      sendResponse({ status: 'error', message: msg });
    }
    return true; // Keep message channel open for async response
  }

  if (message.type === 'EXECUTE_ACTION') {
    executeAction(message.action)
      .then((result) => sendResponse(result))
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        sendResponse({ success: false, message: msg });
      });
    return true;
  }

  return false;
});

