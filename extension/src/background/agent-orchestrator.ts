import { AgentResponse, PSSR, SanitizedContext } from '../shared/types';
import { apiClient } from './api-client';

export interface OrchestrationState {
  lastPageTitle?: string;
  lastUrl?: string;
  totalElements?: number;
  sensitiveCount?: number;
  lastResponse?: AgentResponse;
  lastActionMessage?: string;
  privacyStatus?: 'SAFE' | 'BLOCKED';
  status: 'idle' | 'running' | 'success' | 'error' | 'blocked';
}

class AgentOrchestrator {
  private state: OrchestrationState = {
    status: 'idle',
    privacyStatus: 'SAFE',
  };

  public getState(): OrchestrationState {
    return this.state;
  }

  public async stepAgentCycle(taskPrompt?: string): Promise<OrchestrationState> {
    this.state.status = 'running';

    // 1. Query active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) {
      this.state.status = 'error';
      this.state.lastActionMessage = 'No active browser tab detected';
      return this.state;
    }

    // 2. Request context analysis from content script
    let analyzeRes: {
      status: string;
      pssr?: PSSR;
      context?: SanitizedContext;
      blocked?: boolean;
      reason?: string;
      violations?: string[];
      debug?: {
        totalElements?: number;
        sensitiveCount?: number;
        pageTitle?: string;
        url?: string;
      };
      message?: string;
    };

    try {
      analyzeRes = await chrome.tabs.sendMessage(tab.id, { type: 'ANALYZE_PAGE' });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.state.status = 'error';
      this.state.lastActionMessage = `Content script error: ${errorMsg}. Make sure you are on a valid webpage.`;
      return this.state;
    }

    if (analyzeRes.blocked || analyzeRes.status === 'blocked') {
      this.state.status = 'blocked';
      this.state.privacyStatus = 'BLOCKED';
      this.state.totalElements = analyzeRes.debug?.totalElements ?? 0;
      this.state.sensitiveCount = analyzeRes.debug?.sensitiveCount ?? 0;
      this.state.lastPageTitle = analyzeRes.debug?.pageTitle ?? (tab.title || 'Blocked Page');
      this.state.lastUrl = analyzeRes.debug?.url ?? (tab.url || '');
      this.state.lastActionMessage = `Privacy Firewall Blocked context transmission! Reason: ${analyzeRes.reason || 'privacy_violation'}`;
      return this.state;
    }

    if (analyzeRes.status !== 'ok' || !analyzeRes.pssr) {
      this.state.status = 'error';
      this.state.lastActionMessage = analyzeRes.message || 'DOM analysis failed';
      return this.state;
    }

    this.state.privacyStatus = 'SAFE';
    const pssr = analyzeRes.pssr;
    this.state.lastPageTitle = pssr.page.title;
    this.state.lastUrl = pssr.page.url;
    this.state.totalElements = pssr.redaction_summary.totalElements;
    this.state.sensitiveCount = pssr.redaction_summary.sensitiveCount;

    // 3. Transmit Sanitized context/PSSR to server
    const serverResponse = await apiClient.sendPSSR(pssr, taskPrompt);
    this.state.lastResponse = serverResponse;

    if (serverResponse.status !== 'ok' || !serverResponse.action) {
      this.state.status = 'error';
      this.state.lastActionMessage = serverResponse.message || 'Server returned no actionable response';
      return this.state;
    }

    // 4. Dispatch action execution back to content script
    try {
      const execRes = await chrome.tabs.sendMessage(tab.id, {
        type: 'EXECUTE_ACTION',
        action: serverResponse.action,
      });

      if (execRes && execRes.success) {
        this.state.status = 'success';
        this.state.lastActionMessage = execRes.message || 'Action executed successfully';
      } else {
        this.state.status = 'error';
        this.state.lastActionMessage = execRes?.message || 'Action execution was rejected or failed';
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.state.status = 'error';
      this.state.lastActionMessage = `Action dispatch failed: ${errorMsg}`;
    }

    return this.state;
  }
}

export const agentOrchestrator = new AgentOrchestrator();
