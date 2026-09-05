document.addEventListener('DOMContentLoaded', () => {
  const connectionBadge = document.getElementById('connection-badge')!;
  const btnStep = document.getElementById('btn-step') as HTMLButtonElement;
  const taskInput = document.getElementById('task-prompt') as HTMLInputElement;
  const valElements = document.getElementById('val-elements')!;
  const valRedacted = document.getElementById('val-redacted')!;
  const valPage = document.getElementById('val-page')!;
  const valAction = document.getElementById('val-action')!;
  const valStatus = document.getElementById('val-status')!;
  const logBox = document.getElementById('log-box')!;

  function log(msg: string) {
    logBox.textContent = `[${new Date().toLocaleTimeString()}] ${msg}\n` + logBox.textContent;
  }

  // 1. Check server health
  chrome.runtime.sendMessage({ type: 'PING_SERVER' }, (response) => {
    if (chrome.runtime.lastError) {
      connectionBadge.textContent = 'Offline';
      connectionBadge.className = 'badge badge-disconnected';
      log('Extension runtime disconnected.');
      return;
    }

    if (response && response.connected) {
      connectionBadge.textContent = 'Server Connected';
      connectionBadge.className = 'badge badge-connected';
      log('FastAPI Server is healthy and reachable.');
    } else {
      connectionBadge.textContent = 'Server Unreachable';
      connectionBadge.className = 'badge badge-disconnected';
      log('Cannot connect to FastAPI server at http://localhost:8000.');
    }
  });

  // 2. Fetch existing state
  chrome.runtime.sendMessage({ type: 'GET_STATE' }, (res) => {
    if (res && res.state) {
      updateUIState(res.state);
    }
  });

  // 3. Step button click handler
  btnStep.addEventListener('click', () => {
    btnStep.disabled = true;
    btnStep.textContent = '⏳ Executing...';
    valStatus.textContent = 'Running step...';
    log(`Triggering perception & agent step with prompt: "${taskInput.value}"`);

    chrome.runtime.sendMessage(
      { type: 'STEP_AGENT', taskPrompt: taskInput.value },
      (response) => {
        btnStep.disabled = false;
        btnStep.textContent = '🚀 Run Agent Step';

        if (chrome.runtime.lastError) {
          valStatus.textContent = 'Error';
          log(`Error: ${chrome.runtime.lastError.message}`);
          return;
        }

        if (response && response.status === 'ok' && response.state) {
          updateUIState(response.state);
          log(`Step finished. Status: ${response.state.status}. ${response.state.lastActionMessage || ''}`);
        } else {
          valStatus.textContent = 'Failed';
          log(`Step failed: ${response?.message || 'Unknown error'}`);
        }
      }
    );
  });

  function updateUIState(state: Record<string, unknown>) {
    if (state.lastPageTitle || state.lastUrl) {
      valPage.textContent = (state.lastPageTitle as string) || (state.lastUrl as string);
    }
    if (typeof state.totalElements === 'number') {
      valElements.textContent = String(state.totalElements);
    }
    if (typeof state.sensitiveCount === 'number') {
      valRedacted.textContent = String(state.sensitiveCount);
    }
    if (state.lastResponse && typeof state.lastResponse === 'object') {
      const resp = state.lastResponse as { action?: { action: string; target?: string } };
      if (resp.action) {
        valAction.textContent = `${resp.action.action} (${resp.action.target || 'N/A'})`;
      } else {
        valAction.textContent = 'None';
      }
    }
    if (state.status) {
      valStatus.textContent = String(state.status).toUpperCase();
    }
  }
});
