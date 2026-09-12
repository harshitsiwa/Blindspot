import { describe, test, expect, beforeEach } from 'vitest';
import { extractPageText, extractVisibleTextNodes } from '../src/context/text-extractor';

describe('Workstream 3.2 — Generalized Visible Text Perception Tests', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  test('1. TreeWalker detects visible text in arbitrary div and span tags', () => {
    document.body.innerHTML = `
      <div id="wrapper">
        <span id="info">Your account email is john@example.com</span>
        <div id="notes">Contact phone +1-555-019-2834 for support</div>
      </div>
    `;

    const nodes = extractVisibleTextNodes(document.body);
    expect(nodes.length).toBeGreaterThanOrEqual(2);

    const emailNode = nodes.find((n) => n.text.includes('john@example.com'));
    expect(emailNode).toBeDefined();
    expect(emailNode?.elementId).toBe('info');

    const phoneNode = nodes.find((n) => n.text.includes('+1-555-019-2834'));
    expect(phoneNode).toBeDefined();
    expect(phoneNode?.elementId).toBe('notes');
  });

  test('2. Filters out script, style, and hidden DOM content', () => {
    document.body.innerHTML = `
      <script>const secretToken = "raw_secret_in_js";</script>
      <style>.hidden { display: none; }</style>
      <div style="display: none;">hidden.email@example.com</div>
      <p>Visible public notice</p>
    `;

    const texts = extractPageText(document.body);
    expect(texts).toContain('Visible public notice');
    expect(texts).not.toContain('raw_secret_in_js');
    expect(texts).not.toContain('hidden.email@example.com');
  });

  test('3. Avoids duplicate text snippet extraction', () => {
    document.body.innerHTML = `
      <div>Duplicate text node</div>
      <div>Duplicate text node</div>
    `;

    const texts = extractPageText(document.body);
    expect(texts.filter((t) => t === 'Duplicate text node').length).toBe(1);
  });
});
