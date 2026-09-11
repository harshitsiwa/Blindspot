import { describe, test, expect, beforeEach } from 'vitest';
import { captureSanitizedContext } from '../src/context/context-pipeline';
import { resolveLabel } from '../src/context/label-resolver';
import { sanitizeUrl } from '../src/context/url-sanitizer';
import { deterministicRedactor } from '../src/privacy/redactor';
import { elementMapper } from '../src/content/element-mapper';
import { executeAction } from '../src/content/action-executor';

describe('Phase 2 Context Intelligence & Element Mapper Integration Tests', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    deterministicRedactor.reset();
    elementMapper.reset();
  });

  // 1. DOM extraction generates el_001, el_002, etc.
  test('1. DOM extraction generates canonical el_001, el_002 ID format', async () => {
    document.body.innerHTML = `
      <input type="text" id="username" placeholder="Username" value="john_doe" />
      <button type="submit" id="btn-submit">Submit Form</button>
    `;

    const result = await captureSanitizedContext();
    expect(result.success).toBe(true);
    if (result.success) {
      const elements = result.context.elements;
      expect(elements[0].id).toBe('el_001');
      expect(elements[1].id).toBe('el_002');
    }
  });

  // 2 & 3 & 4. Generated ID registered in elementMapper and matches ContextElement.id
  test('2-4. Generated IDs registered in elementMapper and getElement("el_001") returns correct DOM node', async () => {
    document.body.innerHTML = `
      <input type="email" id="email-input" value="test@test.org" />
    `;

    const result = await captureSanitizedContext();
    expect(result.success).toBe(true);
    if (result.success) {
      const elId = result.context.elements[0].id;
      expect(elId).toBe('el_001');

      const mappedNode = elementMapper.getElement('el_001');
      expect(mappedNode).toBeDefined();
      expect((mappedNode as HTMLElement).id).toBe('email-input');
    }
  });

  // 5 & 9. Perception lifecycle resets stale element mappings
  test('5 & 9. elementMapper is cleared at new capture so stale IDs do not resolve old DOM nodes', async () => {
    document.body.innerHTML = `<input type="text" id="old-node" />`;
    await captureSanitizedContext();

    const oldMapped = elementMapper.getElement('el_001');
    expect((oldMapped as HTMLElement)?.id).toBe('old-node');

    // New perception cycle on new page structure
    document.body.innerHTML = `<button id="new-node">New Button</button>`;
    await captureSanitizedContext();

    const newMapped = elementMapper.getElement('el_001');
    expect(newMapped).toBeDefined();
    expect((newMapped as HTMLElement)?.id).toBe('new-node');
  });

  // 6 & 7. Action: { action: "focus", target: "el_001" } focuses input
  test('6 & 7. Action { action: "focus", target: "el_001" } successfully resolves and focuses element', async () => {
    document.body.innerHTML = `
      <input type="email" id="email-input" value="demo.user@test.org" />
    `;

    await captureSanitizedContext();

    const execResult = await executeAction({ action: 'focus', target: 'el_001' });
    expect(execResult.success).toBe(true);
    expect(execResult.message).toContain('Focused element el_001');
    expect(document.activeElement?.id).toBe('email-input');
  });

  // 8. Action: { action: "click", target: "el_004" } targets button
  test('8. Action { action: "click", target: "el_004" } targets corresponding button', async () => {
    document.body.innerHTML = `
      <input type="email" id="em" />
      <input type="password" id="pass" />
      <input type="checkbox" id="chk" />
      <button id="btn-login">Sign In</button>
    `;

    await captureSanitizedContext();

    let clicked = false;
    const btn = document.getElementById('btn-login');
    btn?.addEventListener('click', () => { clicked = true; });

    const execResult = await executeAction({ action: 'click', target: 'el_004' });
    expect(execResult.success).toBe(true);
    expect(clicked).toBe(true);
  });

  // 10. Backward compatibility with Phase 1 e1 IDs if registered manually
  test('10. Backward compatibility - manual elementMapper.register() without customId uses e1 format', () => {
    const div = document.createElement('div');
    const autoId = elementMapper.register(div);
    expect(autoId).toBe('e1');
    expect(elementMapper.getElement('e1')).toBe(div);
  });

  // 11. Full login.html page simulation verification
  test('11. Full login.html simulation - zero raw PII and focus("el_001") succeeds', async () => {
    document.title = 'Demo Portal — Login';
    document.body.innerHTML = `
      <div class="login-card">
        <h2>Sign in to Account</h2>
        <form>
          <div class="form-group">
            <label for="email-input">Email Address</label>
            <input type="email" id="email-input" name="email" placeholder="user@synthetic-demo.internal" value="demo.user@test.org" />
          </div>
          <div class="form-group">
            <label for="password-input">Password</label>
            <input type="password" id="password-input" name="password" placeholder="••••••••••••" value="SyntheticDemoSecret123!" />
          </div>
          <button type="submit" id="btn-login">Sign In</button>
        </form>
      </div>
    `;

    const captureResult = await captureSanitizedContext();
    expect(captureResult.success).toBe(true);
    if (captureResult.success) {
      const payloadStr = JSON.stringify(captureResult.context);
      expect(payloadStr).not.toContain('demo.user@test.org');
      expect(payloadStr).not.toContain('user@synthetic-demo.internal');
      expect(payloadStr).not.toContain('SyntheticDemoSecret123!');
    }

    const focusResult = await executeAction({ action: 'focus', target: 'el_001' });
    expect(focusResult.success).toBe(true);
    expect(document.activeElement?.id).toBe('email-input');
  });
});
