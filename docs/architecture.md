# Architectural Specifications — SIH26171 (Blindspot)

## Overview

Blindspot is a Privacy-Preserving Vision Agent framework operating across a local browser extension and a remote agent server. The architecture enforces a strict local trust boundary: perception, sensitive data detection, PII redaction, sanitization, action validation, and action execution remain exclusively inside the user's browser environment. The remote server performs visual planning and returns constrained browser action primitives.

```
                     USER
                       │
                       ▼
              CHROME EXTENSION
                       │
          ┌────────────┴────────────┐
          │                         │
          ▼                         ▼
    CONTENT SCRIPT            SERVICE WORKER
          │                         │
          ▼                         ▼
    DOM ANALYSIS              ORCHESTRATION
          │                         │
          └────────────┬────────────┘
                       ▼
             LOCAL PERCEPTION
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
       DOM            OCR       COMPUTER VISION
                                  │
                          ┌───────┴────────┐
                          │                │
                     UI Detector      Face Detector
                          │                │
                          └───────┬────────┘
                                  ▼
                          PRIVACY FIREWALL
                                  │
                          PII Detection
                                  │
                          Redaction Map
                                  │
                 ┌────────────────┴────────────────┐
                 ▼                                 ▼
          SANITIZED DOM                    SANITIZED IMAGE
                 │                                 │
                 └────────────────┬────────────────┘
                                  ▼
                      PRIVACY-PRESERVING
                      SCREEN REPRESENTATION
                               (PSSR)
                                  │
                                HTTPS
                                  │
                                  ▼
                          FASTAPI SERVER
                                  │
                                  ▼
                          SERVER-SIDE VLM
                                  │
                                  ▼
                           ACTION JSON
                                  │
                                  ▼
                     LOCAL ACTION VALIDATOR
                                  │
                          ┌───────┴───────┐
                          │               │
                       VALID           INVALID
                          │               │
                          ▼               ▼
                       EXECUTE          REJECT
                          │
                          ▼
                     NEW PAGE STATE
                          │
                          └──────────► LOOP
```

---

## Key Components

### 1. Local Perception (`extension/src/content/dom-analyzer.ts`)
Inspects active DOM elements, extracting viewport metadata, bounding boxes, labels, visibility status, and element roles without capturing raw user input values.

### 2. Element Mapper (`extension/src/content/element-mapper.ts`)
Maps interactive DOM nodes to stable, anonymous local identifiers (`e1`, `e2`, `e3`). The mapping is kept exclusively within browser memory.

### 3. Privacy Firewall (`extension/src/privacy/sanitizer.ts`)
Evaluates input fields, names, autocomplete hints, and regex patterns for sensitive attributes. Replaces raw values with privacy tokens (`[PASSWORD]`, `[EMAIL]`, `[REDACTED]`) before constructing the PSSR.

### 4. Privacy-Preserving Screen Representation (PSSR)
The canonical data contract passed across the network trust boundary:
```json
{
  "page": { "title": "Demo", "url": "http://localhost/demo", "viewport": { "width": 1440, "height": 900 } },
  "dom": [ { "id": "e1", "type": "input", "role": "input", "label": "Email", "text": "", "value": "[EMAIL]", "sensitive": true } ],
  "visual_context": null,
  "redaction_summary": { "totalElements": 1, "sensitiveCount": 1, "redactedFields": ["e1:input(Email)"] },
  "screenshot": null
}
```

### 5. Server Agent Planner (`server/app/agent/planner.py`)
FastAPI service exposing `POST /api/agent/step`. In Phase 1, runs in **MOCK MODE** to validate architecture end-to-end. Phase 2+ will introduce VLM reasoning (UI-TARS / Qwen3-VL).

### 6. Local Action Validator & Executor (`extension/src/content/action-executor.ts`)
Validates incoming action payloads against authorized schema (`click`, `type`, `scroll`, `select`, `navigate`, `focus`, `back`, `wait`). Prohibits code evaluation (`execute_code`, `eval`).
