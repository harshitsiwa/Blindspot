import { captureSanitizedContext } from '../context/context-pipeline';
import { executeAction } from './action-executor';
import { privacyLog } from '../privacy/privacy-policy';

privacyLog('Content script initialized on host page (Phase 2 Context Intelligence).');

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'ANALYZE_PAGE' || message.type === 'CAPTURE_CONTEXT') {
    captureSanitizedContext({ includeScreenshot: message.includeScreenshot })
      .then((result) => {
        if (result.success) {
          // Adapt context into PSSR structure for Phase 1 backend compatibility if needed
          const pssr = {
            page: {
              title: result.context.page.title,
              url: result.context.page.url,
              viewport: result.context.viewport,
            },
            dom: result.context.elements.map((el) => ({
              id: el.id,
              type: el.type,
              role: el.role,
              label: el.label,
              text: el.text,
              value: el.value,
              bbox: el.rect,
              visible: el.visible,
              enabled: !el.disabled,
              sensitive: el.sensitive,
            })),
            visual_context: result.context.visual,
            redaction_summary: result.context.redaction_summary || {
              totalElements: result.context.elements.length,
              sensitiveCount: result.context.elements.filter((e) => e.sensitive).length,
              redactedFields: [],
            },
            screenshot: result.context.visual.screenshot || null,
          };

          sendResponse({
            status: 'ok',
            context: result.context,
            pssr,
            rawCount: result.context.elements.length,
          });
        } else {
          sendResponse({
            status: 'blocked',
            blocked: true,
            reason: result.reason,
            violations: result.violations,
            debug: result.debug,
          });
        }
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        sendResponse({ status: 'error', message: msg });
      });

    return true; // Keep message channel open for async response
  }

  if (message.type === 'EXECUTE_ACTION') {
    executeAction(message.action)
      .then((res) => sendResponse(res))
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        sendResponse({ success: false, message: msg });
      });
    return true;
  }

  return false;
});
