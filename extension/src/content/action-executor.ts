import { Action } from '../shared/types';
import { validateAction } from '../shared/action-schema';
import { elementMapper } from './element-mapper';
import { privacyLog } from '../privacy/privacy-policy';

export interface ActionExecutionResult {
  success: boolean;
  action: Action;
  message: string;
}

export async function executeAction(rawAction: unknown): Promise<ActionExecutionResult> {
  const validation = validateAction(rawAction);
  if (!validation.valid || !validation.action) {
    privacyLog(`Action validation failed: ${validation.reason}`);
    return {
      success: false,
      action: (rawAction as Action) || { action: 'wait' },
      message: validation.reason || 'Invalid action schema',
    };
  }

  const action = validation.action;
  privacyLog(`Executing validated action: ${action.action} on target: ${action.target || 'N/A'}`);

  try {
    switch (action.action) {
      case 'click': {
        const el = elementMapper.getElement(action.target!);
        if (!el) {
          return { success: false, action, message: `Target element "${action.target}" not found` };
        }
        (el as HTMLElement).click();
        return { success: true, action, message: `Clicked element ${action.target}` };
      }

      case 'focus': {
        const el = elementMapper.getElement(action.target!);
        if (!el) {
          return { success: false, action, message: `Target element "${action.target}" not found` };
        }
        (el as HTMLElement).focus();
        return { success: true, action, message: `Focused element ${action.target}` };
      }

      case 'type': {
        const el = elementMapper.getElement(action.target!);
        if (!el) {
          return { success: false, action, message: `Target element "${action.target}" not found` };
        }
        const input = el as HTMLInputElement | HTMLTextAreaElement;
        input.focus();
        input.value = action.value || '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        return { success: true, action, message: `Typed into element ${action.target}` };
      }

      case 'select': {
        const el = elementMapper.getElement(action.target!);
        if (!el || el.tagName.toLowerCase() !== 'select') {
          return { success: false, action, message: `Target select element "${action.target}" not found` };
        }
        const select = el as HTMLSelectElement;
        select.value = action.value || '';
        select.dispatchEvent(new Event('change', { bubbles: true }));
        return { success: true, action, message: `Selected option in element ${action.target}` };
      }

      case 'scroll': {
        window.scrollBy({ top: 300, behavior: 'smooth' });
        return { success: true, action, message: 'Scrolled page smooth' };
      }

      case 'navigate': {
        if (action.value && (action.value.startsWith('http://') || action.value.startsWith('https://'))) {
          window.location.href = action.value;
          return { success: true, action, message: `Navigating to ${action.value}` };
        }
        return { success: false, action, message: 'Invalid navigation URL' };
      }

      case 'back': {
        window.history.back();
        return { success: true, action, message: 'Navigated back' };
      }

      case 'wait': {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return { success: true, action, message: 'Waited 1000ms' };
      }

      default:
        return { success: false, action, message: `Unsupported action type: ${(action as Action).action}` };
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, action, message: `Execution error: ${errorMsg}` };
  }
}
