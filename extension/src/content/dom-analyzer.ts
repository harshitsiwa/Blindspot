import { DOMElement, PageContext, ViewportDimensions } from '../shared/types';
import { elementMapper } from './element-mapper';
import { getSanitizedValuePlaceholder, isFieldSensitive } from '../privacy/privacy-policy';

export function analyzeDOM(): PageContext {
  elementMapper.reset();

  const viewport: ViewportDimensions = {
    width: window.innerWidth || document.documentElement.clientWidth || 0,
    height: window.innerHeight || document.documentElement.clientHeight || 0,
  };

  const pageInfo = {
    title: document.title || 'Untitled Page',
    url: window.location.href,
    viewport,
  };

  const interactiveSelectors = [
    'button',
    'input',
    'textarea',
    'select',
    'a[href]',
    '[role="button"]',
    '[role="link"]',
    '[role="checkbox"]',
    'h1', 'h2', 'h3',
  ];

  const candidateNodes = Array.from(
    document.querySelectorAll<HTMLElement>(interactiveSelectors.join(','))
  );

  const elements: DOMElement[] = [];

  for (const node of candidateNodes) {
    if (!isElementVisible(node)) {
      continue;
    }

    const rect = node.getBoundingClientRect();
    const id = elementMapper.register(node);
    const tagName = node.tagName.toLowerCase();

    let inputType = '';
    let nameAttr = '';
    let idAttr = node.id || '';
    let autocompleteAttr = '';
    let placeholderAttr = '';
    let ariaLabelAttr = node.getAttribute('aria-label') || '';

    if (tagName === 'input') {
      const inputNode = node as HTMLInputElement;
      inputType = inputNode.type || 'text';
      nameAttr = inputNode.name || '';
      autocompleteAttr = inputNode.autocomplete || '';
      placeholderAttr = inputNode.placeholder || '';
    } else if (tagName === 'textarea') {
      const txtNode = node as HTMLTextAreaElement;
      inputType = 'textarea';
      nameAttr = txtNode.name || '';
      placeholderAttr = txtNode.placeholder || '';
    } else if (tagName === 'select') {
      inputType = 'select';
      nameAttr = (node as HTMLSelectElement).name || '';
    } else {
      inputType = tagName;
    }

    const sensitive = isFieldSensitive(
      inputType,
      nameAttr,
      idAttr,
      autocompleteAttr,
      placeholderAttr,
      ariaLabelAttr
    );

    // Label extraction
    const label = extractLabel(node, placeholderAttr, ariaLabelAttr);
    const text = (node.innerText || node.textContent || '').trim().substring(0, 100);

    // Value sanitization logic: ALWAYS SANITIZE SENSITIVE/INPUT VALUES
    let sanitizedValue: string | undefined = undefined;

    if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
      const inputEl = node as HTMLInputElement;
      const rawVal = inputEl.value;

      if (sensitive || inputType === 'password' || inputType === 'email' || inputType === 'tel') {
        sanitizedValue = getSanitizedValuePlaceholder(inputType, nameAttr || idAttr);
      } else if (rawVal && rawVal.trim().length > 0) {
        // Even for non-explicitly sensitive fields, substitute value if suspicious
        sanitizedValue = '[REDACTED]';
      }
    }

    elements.push({
      id,
      type: inputType,
      role: node.getAttribute('role') || tagName,
      label,
      text,
      value: sanitizedValue,
      bbox: {
        x: Math.round(rect.left),
        y: Math.round(rect.top),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      },
      visible: true,
      enabled: !(node as HTMLInputElement).disabled,
      sensitive,
    });
  }

  return {
    page: pageInfo,
    elements,
  };
}

function isElementVisible(el: HTMLElement): boolean {
  if (!el.offsetParent && el.tagName.toLowerCase() !== 'body') {
    return false;
  }
  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
    return false;
  }
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function extractLabel(el: HTMLElement, placeholder: string, ariaLabel: string): string {
  if (ariaLabel) return ariaLabel;
  if (placeholder) return placeholder;

  if (el.id) {
    const labelNode = document.querySelector<HTMLLabelElement>(`label[for="${el.id}"]`);
    if (labelNode && labelNode.textContent) {
      return labelNode.textContent.trim();
    }
  }

  const parentLabel = el.closest('label');
  if (parentLabel && parentLabel.textContent) {
    return parentLabel.textContent.trim();
  }

  return (el.innerText || el.textContent || '').trim().substring(0, 50);
}
