import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { dynamicDOMObserver } from '../src/context/dynamic-observer';

describe('Workstream 3.3 — Dynamic DOM Protection Tests', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    dynamicDOMObserver.reset();
  });

  afterEach(() => {
    dynamicDOMObserver.stop();
  });

  test('1. Observer manages standalone lifecycle (start, isActive, stop)', () => {
    expect(dynamicDOMObserver.isActive()).toBe(false);
    dynamicDOMObserver.start(document.body);
    expect(dynamicDOMObserver.isActive()).toBe(true);
    dynamicDOMObserver.stop();
    expect(dynamicDOMObserver.isActive()).toBe(false);
  });

  test('2. Detects dynamically inserted DOM node containing PII', async () => {
    dynamicDOMObserver.start(document.body);

    const div = document.createElement('div');
    div.id = 'dynamic-user-card';
    div.innerHTML = `<span>User account email is john.dynamic@example.com</span>`;
    document.body.appendChild(div);

    // Process mutations synchronously for testing
    dynamicDOMObserver.processPendingMutations();

    const state = dynamicDOMObserver.getLatestPrivacyState();
    expect(state.detectedCount).toBeGreaterThanOrEqual(1);

    const emailDet = state.allDetections.find((d) => d.type === 'email');
    expect(emailDet).toBeDefined();
    expect(emailDet?.text).toBe('john.dynamic@example.com');
  });

  test('3. Dynamic observer state persists independently across perception cycles', () => {
    dynamicDOMObserver.start(document.body);

    const input = document.createElement('input');
    input.id = 'dynamic-input';
    input.setAttribute('value', 'api_key_sk_999988887777666655554444');
    document.body.appendChild(input);

    dynamicDOMObserver.processPendingMutations();

    const state1 = dynamicDOMObserver.getLatestPrivacyState();
    expect(state1.detectedCount).toBeGreaterThanOrEqual(1);
  });
});
