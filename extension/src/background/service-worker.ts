import { agentOrchestrator } from './agent-orchestrator';
import { apiClient } from './api-client';
import { privacyLog } from '../privacy/privacy-policy';

privacyLog('Background Service Worker initialized.');

chrome.runtime.onInstalled.addListener(() => {
  privacyLog('Blindspot Privacy Agent extension installed.');
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'PING_SERVER') {
    apiClient.checkHealth().then((connected) => {
      sendResponse({ connected });
    });
    return true;
  }

  if (message.type === 'GET_STATE') {
    sendResponse({ state: agentOrchestrator.getState() });
    return true;
  }

  if (message.type === 'STEP_AGENT') {
    agentOrchestrator
      .stepAgentCycle(message.taskPrompt)
      .then((state) => {
        sendResponse({ status: 'ok', state });
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        sendResponse({ status: 'error', message: msg });
      });
    return true;
  }

  return false;
});

