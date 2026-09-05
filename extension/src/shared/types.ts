export interface ViewportDimensions {
  width: number;
  height: number;
}

export interface PageInfo {
  title: string;
  url: string;
  viewport: ViewportDimensions;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DOMElement {
  id: string;
  type: string;
  role: string;
  label: string;
  text: string;
  value?: string;
  bbox: BoundingBox;
  visible: boolean;
  enabled: boolean;
  sensitive: boolean;
}

export interface PageContext {
  page: PageInfo;
  elements: DOMElement[];
}

export interface RedactionSummary {
  totalElements: number;
  sensitiveCount: number;
  redactedFields: string[];
}

export interface PSSR {
  page: PageInfo;
  dom: DOMElement[];
  visual_context: Record<string, unknown> | null;
  redaction_summary: RedactionSummary;
  screenshot: string | null;
}

export type ActionType =
  | 'click'
  | 'type'
  | 'scroll'
  | 'select'
  | 'navigate'
  | 'focus'
  | 'back'
  | 'wait';

export interface Action {
  action: ActionType;
  target?: string;
  value?: string;
}

export interface AgentRequest {
  pssr: PSSR;
  task_prompt?: string;
}

export interface AgentResponse {
  status: 'ok' | 'error';
  message: string;
  action: Action | null;
  planner_mode?: 'mock' | 'vlm';
}

export interface ActionValidationResult {
  valid: boolean;
  reason?: string;
  action?: Action;
}
