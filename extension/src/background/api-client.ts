import { AgentRequest, AgentResponse, PSSR } from '../shared/types';
import { privacyLog } from '../privacy/privacy-policy';

const DEFAULT_SERVER_URL = 'http://localhost:8000';

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = DEFAULT_SERVER_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Enforces privacy by requiring a Sanitized PSSR payload.
   * Direct transmission of raw DOM or un-sanitized context is strictly prohibited.
   */
  public async sendPSSR(pssr: PSSR, taskPrompt?: string): Promise<AgentResponse> {
    const endpoint = `${this.baseUrl}/api/agent/step`;
    const payload: AgentRequest = {
      pssr,
      task_prompt: taskPrompt || 'Perform appropriate page action',
    };

    privacyLog(`Transmitting sanitized PSSR payload to backend: ${endpoint}`);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errText = await response.text();
        return {
          status: 'error',
          message: `Server returned HTTP ${response.status}: ${errText}`,
          action: null,
        };
      }

      const data: AgentResponse = await response.json();
      return data;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      privacyLog(`Network failure connecting to FastAPI server: ${errorMsg}`);
      return {
        status: 'error',
        message: `Failed to connect to agent server at ${this.baseUrl}. Error: ${errorMsg}`,
        action: null,
      };
    }
  }

  public async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      if (response.ok) {
        const data = await response.json();
        return data.status === 'ok';
      }
      return false;
    } catch {
      return false;
    }
  }
}

export const apiClient = new ApiClient();
