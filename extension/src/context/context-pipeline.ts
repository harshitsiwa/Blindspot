import { ContextCaptureResult, SanitizedContext } from '../shared/types';
import { extractDOMContext } from './dom-extractor';
import { extractPageText } from './text-extractor';
import { getViewportDimensions, captureVisualContext } from './visual-capture';
import { sanitizeUrl } from './url-sanitizer';
import { deterministicRedactor } from '../privacy/redactor';
import { runFinalPrivacyScan } from '../privacy/privacy-firewall';
import { dynamicDOMObserver } from './dynamic-observer';
import { fusionEngine } from '../privacy/privacy-fusion';

/**
 * Main entry point for Context Intelligence perception pipeline.
 * Extracts, sanitizes, and verifies page context against local Privacy Firewall.
 * Consumes latest validated local DynamicDOMObserver state and runs a final synchronous fail-closed scan.
 */
export async function captureSanitizedContext(
  options: { includeScreenshot?: boolean; injectLeakForTest?: boolean } = {}
): Promise<ContextCaptureResult> {
  // 1. Reset deterministic redactor mapping state for fresh perception cycle
  deterministicRedactor.reset();

  // 2. Extract interactive elements & apply deterministic PII redaction
  const { elements, sensitiveCount } = extractDOMContext(document, deterministicRedactor);

  // 3. Extract visible page text & apply redaction to text snippets
  const rawTexts = extractPageText(document);
  const redactedTexts = rawTexts.map((txt) => deterministicRedactor.redactText(txt));

  // 4. Consume latest local DynamicDOMObserver privacy state without starting/stopping observer
  const dynamicState = dynamicDOMObserver.getLatestPrivacyState();

  // 5. Fuse evidence across DOM, text, and dynamic observer sources
  const fusedRegions = fusionEngine.fuseEvidence({
    domDetections: [],
    textDetections: [],
    dynamicDetections: dynamicState.allDetections,
  });

  // 6. Extract page metadata & sanitize URL query parameters
  const pageTitle = (document.title || 'Untitled Page').trim();
  const rawUrl = window.location.href;
  const sanitizedUrl = sanitizeUrl(rawUrl, deterministicRedactor);

  // 7. Capture viewport & visual context
  const viewport = getViewportDimensions();
  const visualContext = await captureVisualContext(options.includeScreenshot ?? false);

  // 8. Calculate total sensitive redactions & build Context Schema 2.0 package
  const localValueMap = deterministicRedactor.getLocalValueMap();
  const totalSensitiveCount = Math.max(sensitiveCount + dynamicState.detectedCount, localValueMap.size);

  const redactedFieldsList = Array.from(
    new Set([
      ...elements
        .filter((el) => el.sensitive)
        .map((el) => `${el.id}:${el.type}(${el.label || el.role})`),
      ...fusedRegions.map((r) => `dynamic:${r.type}(${r.placeholder})`),
      ...Array.from(localValueMap.values()).map((ph) => `text:${ph}`),
    ])
  );

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
      sensitiveCount: totalSensitiveCount,
      redactedFields: redactedFieldsList,
    },
  };

  // Intentional Privacy Firewall leak injection (used for Acceptance Test)
  if (options.injectLeakForTest) {
    (contextPackage as unknown as Record<string, string>).leakedSecret = 'unredacted.leak@private-bank.com';
  }

  // 9. Run mandatory final local Privacy Firewall fail-closed scan prior to payload transmission
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
