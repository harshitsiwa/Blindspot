import { isElementVisible } from './visibility';

export function extractPageText(root: ParentNode = document): string[] {
  const selectors = [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p',
    'label',
    'legend',
    'figcaption',
    '.instruction', '.description', '[role="status"]', '[role="alert"]',
  ];

  const nodes = Array.from(root.querySelectorAll<HTMLElement>(selectors.join(',')));
  const extracted: string[] = [];
  const seenTexts = new Set<string>();

  for (const node of nodes) {
    // Exclude scripts, styles, svg internals
    const tagName = node.tagName.toLowerCase();
    if (tagName === 'script' || tagName === 'style' || tagName === 'svg') continue;

    if (!isElementVisible(node)) continue;

    const text = (node.innerText || node.textContent || '').trim();
    if (!text || text.length < 2) continue;

    // Truncate overly long text blocks
    const cleanedText = text.replace(/\s+/g, ' ').substring(0, 300);

    if (!seenTexts.has(cleanedText)) {
      seenTexts.add(cleanedText);
      extracted.push(cleanedText);
    }
  }

  return extracted;
}
