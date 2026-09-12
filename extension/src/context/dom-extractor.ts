import { ContextElement } from '../shared/types';
import { resolveLabel } from './label-resolver';
import { isElementVisible } from './visibility';
import { isFieldSensitive } from '../privacy/privacy-policy';
import { DeterministicRedactor } from '../privacy/redactor';
import { elementMapper } from '../content/element-mapper';

export interface ExtractedDOMContext {
  elements: ContextElement[];
  rawCount: number;
  sensitiveCount: number;
}

export function extractDOMContext(
  root: ParentNode = document,
  redactor?: DeterministicRedactor
): ExtractedDOMContext {
  // Clear stale element mappings from previous perception cycles
  elementMapper.reset();

  const selectors = [
    'input',
    'textarea',
    'select',
    'option',
    'button',
    'a[href]',
    '[role="button"]',
    '[role="link"]',
    '[role="textbox"]',
    '[role="checkbox"]',
    '[role="radio"]',
  ];

  const candidateNodes = Array.from(
    root.querySelectorAll<HTMLElement>(selectors.join(','))
  );

  const elements: ContextElement[] = [];
  let counter = 1;
  let sensitiveCount = 0;

  for (const node of candidateNodes) {
    const tagName = node.tagName.toLowerCase();

    // Ignore script, style, svg, or internal elements
    if (tagName === 'script' || tagName === 'style' || tagName === 'svg') continue;

    const visible = isElementVisible(node);
    const rect = node.getBoundingClientRect();

    let inputType = tagName;
    let nameAttr = '';
    let idAttr = node.id || '';
    let autocompleteAttr = '';
    let placeholderAttr = '';
    let ariaLabelAttr = node.getAttribute('aria-label') || '';
    let rawValue = '';

    if (tagName === 'input') {
      const inputEl = node as HTMLInputElement;
      inputType = (inputEl.type || 'text').toLowerCase();
      nameAttr = inputEl.name || '';
      autocompleteAttr = inputEl.autocomplete || '';
      placeholderAttr = inputEl.placeholder || '';
      rawValue = inputEl.value || '';
    } else if (tagName === 'textarea') {
      const txtEl = node as HTMLTextAreaElement;
      inputType = 'textarea';
      nameAttr = txtEl.name || '';
      placeholderAttr = txtEl.placeholder || '';
      rawValue = txtEl.value || '';
    } else if (tagName === 'select') {
      const selEl = node as HTMLSelectElement;
      inputType = 'select';
      nameAttr = selEl.name || '';
      rawValue = selEl.value || '';
    } else if (tagName === 'option') {
      const optEl = node as HTMLOptionElement;
      inputType = 'option';
      rawValue = optEl.value || optEl.text || '';
    }

    const sensitive = isFieldSensitive(
      inputType,
      nameAttr,
      idAttr,
      autocompleteAttr,
      placeholderAttr,
      ariaLabelAttr
    );

    if (sensitive) {
      sensitiveCount++;
    }

    const rawLabel = resolveLabel(node);
    const elementText = (node.innerText || node.textContent || '').trim().substring(0, 150);

    // Value sanitization logic: Redact if sensitive or contains PII
    let sanitizedValue: string | undefined = undefined;

    if (rawValue && rawValue.trim().length > 0) {
      if (sensitive || inputType === 'password' || inputType === 'email' || inputType === 'tel') {
        let category = 'SECRET';
        const lowerName = (nameAttr || '').toLowerCase();
        if (inputType === 'password' || lowerName.includes('pass')) {
          category = 'PASSWORD';
        } else if (inputType === 'email' || lowerName.includes('email')) {
          category = 'EMAIL';
        } else if (inputType === 'tel' || lowerName.includes('phone') || lowerName.includes('mobile')) {
          category = 'PHONE';
        } else if (lowerName.includes('card') || lowerName.includes('credit')) {
          category = 'CARD';
        } else if (lowerName.includes('pan')) {
          category = 'PAN';
        } else if (lowerName.includes('aadhaar') || lowerName.includes('adhar')) {
          category = 'AADHAAR';
        } else if (lowerName.includes('ssn')) {
          category = 'SSN';
        }

        sanitizedValue = redactor
          ? redactor.getPlaceholder(rawValue, category)
          : `[${category}_1]`;
      } else {
        // Redact PII in text inputs using redactor if present
        sanitizedValue = redactor ? redactor.redactText(rawValue) : rawValue;
      }
    }

    // Sanitize all free-text DOM fields through the redactor pipeline
    const sanitizedLabel = redactor ? redactor.redactText(rawLabel) : rawLabel;
    const sanitizedPlaceholder = placeholderAttr
      ? redactor
        ? redactor.redactText(placeholderAttr)
        : placeholderAttr
      : undefined;
    const sanitizedAriaLabel = ariaLabelAttr
      ? redactor
        ? redactor.redactText(ariaLabelAttr)
        : ariaLabelAttr
      : undefined;
    const sanitizedName = nameAttr
      ? redactor
        ? redactor.redactText(nameAttr)
        : nameAttr
      : undefined;
    const sanitizedText = elementText
      ? redactor
        ? redactor.redactText(elementText)
        : elementText
      : '';

    // Generate canonical Phase 2 ID format e.g. "el_001" and register in local elementMapper
    const paddedIndex = String(counter++).padStart(3, '0');
    const elementId = `el_${paddedIndex}`;

    // Register (elementId -> node) mapping in local content script memory
    elementMapper.register(node, elementId);

    elements.push({
      id: elementId,
      type: inputType,
      role: node.getAttribute('role') || tagName,
      label: sanitizedLabel,
      placeholder: sanitizedPlaceholder,
      value: sanitizedValue,
      text: sanitizedText,
      name: sanitizedName,
      ariaLabel: sanitizedAriaLabel,
      sensitive,
      visible,
      disabled: (node as HTMLInputElement).disabled || false,
      rect: {
        x: Math.round(rect.left),
        y: Math.round(rect.top),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      },
    });
  }

  return {
    elements,
    rawCount: candidateNodes.length,
    sensitiveCount,
  };
}
