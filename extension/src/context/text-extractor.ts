import { isElementVisible } from './visibility';

export interface VisibleTextNodeInfo {
  text: string;
  element: HTMLElement;
  elementId?: string;
}

/**
 * Generalized local visible-text traversal using document TreeWalker & container aggregation.
 * Collects all non-empty, visible text fragments while preserving direct parent element references
 * and handling PII split across inline child tags (e.g. <span>email</span><span>@</span><span>domain</span>).
 */
export function extractVisibleTextNodes(root: Node = document.body || document): VisibleTextNodeInfo[] {
  if (!root) return [];

  const results: VisibleTextNodeInfo[] = [];
  const seenTexts = new Set<string>();

  // 1. Leaf text node traversal via TreeWalker
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node: Node) => {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;

        const tagName = parent.tagName.toLowerCase();
        if (tagName === 'script' || tagName === 'style' || tagName === 'svg' || tagName === 'noscript') {
          return NodeFilter.FILTER_REJECT;
        }

        if (!isElementVisible(parent)) {
          return NodeFilter.FILTER_REJECT;
        }

        const trimmed = (node.nodeValue || '').trim();
        if (!trimmed || trimmed.length < 2) {
          return NodeFilter.FILTER_REJECT;
        }

        return NodeFilter.FILTER_ACCEPT;
      },
    }
  );

  let currentNode = walker.nextNode();
  while (currentNode) {
    const parent = currentNode.parentElement as HTMLElement;
    const rawText = (currentNode.nodeValue || '').trim();
    const cleanedText = rawText.replace(/\s+/g, ' ').substring(0, 300);

    if (cleanedText && !seenTexts.has(cleanedText)) {
      seenTexts.add(cleanedText);
      results.push({
        text: cleanedText,
        element: parent,
        elementId: parent.id || undefined,
      });
    }

    currentNode = walker.nextNode();
  }

  // 2. Container element aggregation for split inline child elements (e.g. <span> tags)
  const rootElement = root instanceof HTMLElement ? root : (document.body || document.documentElement);
  if (rootElement && rootElement.querySelectorAll) {
    const containerNodes = Array.from(
      rootElement.querySelectorAll<HTMLElement>('p, div, li, td, th, label, section, article')
    );
    for (const el of containerNodes) {
      const tagName = el.tagName.toLowerCase();
      if (tagName === 'script' || tagName === 'style' || tagName === 'svg' || tagName === 'noscript') continue;
      if (!isElementVisible(el)) continue;

      if (el.children.length > 0) {
        const rawText = (el.innerText || el.textContent || '').trim();
        if (rawText && rawText.length >= 2) {
          const cleanedText = rawText.replace(/\s+/g, ' ').substring(0, 300);
          if (cleanedText && !seenTexts.has(cleanedText)) {
            seenTexts.add(cleanedText);
            results.push({
              text: cleanedText,
              element: el,
              elementId: el.id || undefined,
            });
          }
        }
      }
    }
  }

  return results;
}

/**
 * Extracts visible page text snippets for Context Schema 2.0.
 * Backwards compatible with Phase 2 extractPageText API.
 */
export function extractPageText(root: ParentNode = document): string[] {
  const rootNode = root instanceof Node ? root : document.body || document;
  const textNodes = extractVisibleTextNodes(rootNode);
  return textNodes.map((n) => n.text);
}
