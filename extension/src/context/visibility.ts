/**
 * Determines whether a DOM element is currently visible/rendered in the browser.
 * Hidden elements will have visible = false, but MUST NOT bypass privacy scanning.
 */
export function isElementVisible(el: HTMLElement): boolean {
  if (!el) return false;

  // Check offsetParent (false if display: none or unattached, except position: fixed or body/html)
  if (!el.offsetParent && el.tagName.toLowerCase() !== 'body' && el.tagName.toLowerCase() !== 'html') {
    const style = window.getComputedStyle(el);
    if (style.position !== 'fixed' && style.position !== 'sticky') {
      return false;
    }
  }

  const style = window.getComputedStyle(el);

  if (style.display === 'none') {
    return false;
  }

  if (style.visibility === 'hidden' || style.visibility === 'collapse') {
    return false;
  }

  const opacityVal = parseFloat(style.opacity);
  if (!isNaN(opacityVal) && opacityVal <= 0.01) {
    return false;
  }

  const rect = el.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return false;
  }

  return true;
}
