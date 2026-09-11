/**
 * Resolves form control labels using a 7-stage priority priority sequence:
 * 1. label[for]
 * 2. wrapping label element
 * 3. aria-label
 * 4. aria-labelledby
 * 5. placeholder
 * 6. name
 * 7. nearby visible text
 */
export function resolveLabel(element: HTMLElement): string {
  if (!element) return '';

  // 1. label[for="id"]
  if (element.id) {
    try {
      const labelEl = document.querySelector<HTMLLabelElement>(`label[for="${CSS.escape(element.id)}"]`);
      if (labelEl && labelEl.textContent) {
        const txt = labelEl.textContent.trim();
        if (txt) return txt;
      }
    } catch {
      // Ignore CSS selector escape errors in edge cases
    }
  }

  // 2. Wrapping label element
  const parentLabel = element.closest('label');
  if (parentLabel && parentLabel.textContent) {
    const txt = parentLabel.textContent.trim();
    if (txt) return txt;
  }

  // 3. aria-label
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel && ariaLabel.trim()) {
    return ariaLabel.trim();
  }

  // 4. aria-labelledby
  const ariaLabelledBy = element.getAttribute('aria-labelledby');
  if (ariaLabelledBy) {
    const ids = ariaLabelledBy.split(/\s+/);
    const parts: string[] = [];
    for (const id of ids) {
      if (id) {
        const target = document.getElementById(id);
        if (target && target.textContent) {
          parts.push(target.textContent.trim());
        }
      }
    }
    if (parts.length > 0) {
      return parts.join(' ');
    }
  }

  // 5. placeholder
  const placeholder = element.getAttribute('placeholder');
  if (placeholder && placeholder.trim()) {
    return placeholder.trim();
  }

  // 6. name
  const nameAttr = element.getAttribute('name');
  if (nameAttr && nameAttr.trim()) {
    return nameAttr.trim();
  }

  // 7. Nearby visible text (preceding text node or sibling)
  const prevSibling = element.previousElementSibling;
  if (prevSibling && prevSibling.textContent && prevSibling.textContent.trim().length > 0) {
    const txt = prevSibling.textContent.trim();
    if (txt.length <= 40) {
      return txt;
    }
  }

  // Fallback to text content of the element itself (e.g. for buttons)
  const selfText = (element.innerText || element.textContent || '').trim();
  if (selfText.length > 0 && selfText.length <= 50) {
    return selfText;
  }

  return '';
}
