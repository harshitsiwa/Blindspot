import { PageContext, PSSR, RedactionSummary } from '../shared/types';
import { privacyLog } from './privacy-policy';

/**
 * Sanitizes PageContext into a Privacy-Preserving Screen Representation (PSSR)
 * object guaranteed safe for remote transmission to the agent backend.
 */
export function sanitizeDOMContext(pageContext: PageContext): PSSR {
  const sensitiveElements = pageContext.elements.filter((el) => el.sensitive);
  const redactedFieldNames = sensitiveElements.map(
    (el) => `${el.id}:${el.type}(${el.label || el.role})`
  );

  const redactionSummary: RedactionSummary = {
    totalElements: pageContext.elements.length,
    sensitiveCount: sensitiveElements.length,
    redactedFields: redactedFieldNames,
  };

  privacyLog(
    `Sanitized page context: ${pageContext.elements.length} elements evaluated, ${sensitiveElements.length} sensitive fields redacted.`
  );

  const pssr: PSSR = {
    page: {
      title: pageContext.page.title,
      url: pageContext.page.url,
      viewport: pageContext.page.viewport,
    },
    dom: pageContext.elements.map((el) => ({
      id: el.id,
      type: el.type,
      role: el.role,
      label: el.label,
      text: el.sensitive ? '[REDACTED_TEXT]' : el.text,
      value: el.value,
      bbox: el.bbox,
      visible: el.visible,
      enabled: el.enabled,
      sensitive: el.sensitive,
    })),
    visual_context: null,
    redaction_summary: redactionSummary,
    screenshot: null,
  };

  return pssr;
}
