export interface ViewportDimensions {
  width: number;
  height: number;
}

export interface PageInfo {
  title: string;
  url: string;
  viewport?: ViewportDimensions;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BoundingRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
  * Context Schema 2.0 Element representation
  */
export interface ContextElement {
  id: string; // e.g. "el_001"
  type: string;
  role: string;
  label: string;
  placeholder?: string;
  value?: string;
  text: string;
  name?: string;
  ariaLabel?: string;
  sensitive: boolean;
  visible: boolean;
  disabled: boolean;
  rect: BoundingRect;
}

/**
  * Context Schema 2.0 Visual Context representation
  */
export interface VisualContextMeta {
  available: boolean;
  viewportWidth?: number;
  viewportHeight?: number;
  screenshot?: string | null;
}

/**
  * Schema 2.0 Sanitized Context Package
  */
export interface SanitizedContext {
  schema_version: '2.0';
  page: {
    title: string;
    url: string;
  };
  viewport: ViewportDimensions;
  elements: ContextElement[];
  text: string[];
  visual: VisualContextMeta;
  redaction_summary?: RedactionSummary;
}

/**
  * Result of captureSanitizedContext() API (Phase 3 Contract)
  */
export type ContextCaptureResult =
  | {
      success: true;
      context: SanitizedContext;
    }
  | {
      success: false;
      blocked: true;
      reason: 'privacy_violation';
      violations?: string[];
      debug?: Record<string, unknown>;
    };

// Backwards compatibility Phase 1 PSSR types
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
  page: PageInfo & { viewport: ViewportDimensions };
  elements: DOMElement[];
}

export interface RedactionSummary {
  totalElements: number;
  sensitiveCount: number;
  redactedFields: string[];
}

export interface PSSR {
  page: PageInfo & { viewport: ViewportDimensions };
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
  pssr?: PSSR;
  context?: SanitizedContext;
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
