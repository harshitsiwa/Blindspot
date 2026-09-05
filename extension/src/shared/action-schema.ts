import { Action, ActionType, ActionValidationResult } from './types';

export const ALLOWED_ACTIONS: ReadonlySet<ActionType> = new Set([
  'click',
  'type',
  'scroll',
  'select',
  'navigate',
  'focus',
  'back',
  'wait',
]);

/**
 * Validates whether an incoming action payload strictly conforms to the Action schema
 * and is within the authorized set of safe browser actions.
 */
export function validateAction(payload: unknown): ActionValidationResult {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, reason: 'Action payload must be a non-null object' };
  }

  const obj = payload as Record<string, unknown>;

  if (typeof obj.action !== 'string') {
    return { valid: false, reason: 'Action payload missing string field "action"' };
  }

  const actionName = obj.action as ActionType;

  // Strict check against prohibited or arbitrary code execution
  if (actionName as string === 'execute_code' || actionName as string === 'eval' || actionName as string === 'script') {
    return { valid: false, reason: `Action "${actionName}" is forbidden due to security policy` };
  }

  if (!ALLOWED_ACTIONS.has(actionName)) {
    return { valid: false, reason: `Action "${actionName}" is not supported` };
  }

  // Target requirement check for target-dependent actions
  if (['click', 'type', 'select', 'focus'].includes(actionName)) {
    if (!obj.target || typeof obj.target !== 'string') {
      return { valid: false, reason: `Action "${actionName}" requires a valid string "target"` };
    }
  }

  // Type requirement check
  if (actionName === 'type' && (typeof obj.value !== 'string')) {
    return { valid: false, reason: 'Action "type" requires a string "value"' };
  }

  const sanitizedAction: Action = {
    action: actionName,
    target: typeof obj.target === 'string' ? obj.target : undefined,
    value: typeof obj.value === 'string' ? obj.value : undefined,
  };

  return { valid: true, action: sanitizedAction };
}
