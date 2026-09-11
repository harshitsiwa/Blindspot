import { ContextCaptureResult, SanitizedContext } from '../shared/types';
import { extractDOMContext } from './dom-extractor';
import { extractPageText } from './text-extractor';
import { getViewportDimensions, captureVisualContext } from './visual-capture';
import { sanitizeUrl } from './url-sanitizer';
import { deterministicRedactor } from '../privacy/redactor';
import { runFinalPrivacyScan } from '../privacy/privacy-firewall';

/**
 * Main entry point for Phase 2 Context Intelligence pipeline.
 * Extracts, sanitizes, and verifies page context against local Privacy Firewall.
 * Exposes captureSanitizedContext() API contract for Phase 3 layer.
 */
export async function captureSanitizedContext(
  options: { includeScreenshot?: boolean; injectLeakForTest?: boolean } = {}
): Promise<ContextCaptureResult> {
  // 1. Reset deterministic redactor mapping state for fresh context capture
  deterministicRedactor.reset();

  // 2. Extract interactive elements & apply deterministic PII redaction
  const { elements, sensitiveCount } = extractDOMContext(document, deterministicRedactor);

  // 3. Extract visible page text & apply redaction to text snippets
  const rawTexts = extractPageText(document);
  const redactedTexts = rawTexts.map((txt) => deterministicRedactor.redactText(txt));

  // 4. Extract page metadata & sanitize URL query parameters
  const pageTitle = (document.title || 'Untitled Page').trim();
  const rawUrl = window.location.href;
  const sanitizedUrl = sanitizeUrl(rawUrl, deterministicRedactor);

  // 5. Capture viewport & visual context
  const viewport = getViewportDimensions();
  const visualContext = await captureVisualContext(options.includeScreenshot ?? false);

  // 6. Build Context Schema 2.0 package
  const contextPackage: SanitizedContext = {
    schema_version: '2.0',
    page: {
      title: pageTitle,
      url: sanitizedUrl,
    },
    viewport,
    elements,
    text: redactedTexts,
    visual: visualContext,
    redaction_summary: {
      totalElements: elements.length,
      sensitiveCount,
      redactedFields: elements
        .filter((el) => el.sensitive)
        .map((el) => `${el.id}:${el.type}(${el.label || el.role})`),
    },
  };

  // Intentional Privacy Firewall leak injection (used for Acceptance Test 10)
  if (options.injectLeakForTest) {
    (contextPackage as unknown as Record<string, string>).leakedSecret = 'unredacted.leak@private-bank.com';
  }

  // 7. Run mandatory local Privacy Firewall final scan
  const localMap = deterministicRedactor.getLocalValueMap();
  const firewallResult = runFinalPrivacyScan(contextPackage, localMap);

  if (!firewallResult.safe) {
    return {
      success: false,
      blocked: true,
      reason: 'privacy_violation',
      violations: firewallResult.violations,
      debug: {
        totalElements: elements.length,
        sensitiveCount,
        pageTitle,
        url: sanitizedUrl,
      },
    };
  }

  return {
    success: true,
    context: contextPackage,
  };
}
