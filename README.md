# Blindspot — Privacy-Preserving Vision Agent (SIH26171)

[![Phase 1 Prototype](https://img.shields.io/badge/Phase_1-Runnable_Skeleton-emerald)](#) [![License](https://img.shields.io/badge/License-MIT-blue)](#)

> **SIH26171 Solution**: A privacy-preserving vision agent framework for browsers. Perception, sensitive-data detection, redaction, and action validation run locally inside the user's browser. Heavy visual reasoning is performed by a remote server receiving only sanitized Privacy-Preserving Screen Representations (PSSR).

---

## Architecture Overview

```
         RAW USER SCREEN / DOM
                   │
                   ▼
      ┌─────────────────────────┐
      │   LOCAL PERCEPTION      │
      └────────────┬────────────┘
                   │
                   ▼
      ┌─────────────────────────┐
      │    PRIVACY FIREWALL     │  <-- Redacts Passwords, Emails, PII locally
      └────────────┬────────────┘
                   │
      ═════════════════════════════
         HARD TRUST BOUNDARY
      ═════════════════════════════
                   │
                   ▼
        SANITIZED PSSR PAYLOAD
                   │
                   ▼
         FASTAPI SERVER & VLM
                   │
                   ▼
         CONSTRAINED ACTION JSON
                   │
                   ▼
     LOCAL ACTION VALIDATOR & EXEC
                   │
                   ▼
            BROWSER ACTION
```

---

## Repository Structure

```text
sih26171/ (Blindspot)
│
├── extension/             # Manifest V3 Chrome Extension
│   ├── manifest.json      # Extension manifest
│   ├── package.json       # Node dependencies
│   ├── tsconfig.json      # TypeScript setup
│   ├── vite.config.ts     # Vite bundler config
│   └── src/
│       ├── background/    # Service worker & API client
│       ├── content/       # DOM Analyzer, Element Mapper, Action Executor
│       ├── privacy/       # Privacy Firewall, Sanitizer, Policy rules
│       ├── vision/        # Local ML model stubs
│       ├── popup/         # Debug UI
│       └── shared/        # Action schema & TypeScript types
│
├── server/                # FastAPI Agent Server
│   ├── requirements.txt   # Python dependencies
│   ├── Dockerfile         # Container setup
│   └── app/
│       ├── main.py        # FastAPI app & /health
│       ├── api/           # /api/agent/step router
│       ├── agent/         # Deterministic Mock Planner & Prompt builder
│       ├── vlm/           # VLM adapter interface stub
│       └── schemas/       # Pydantic schemas (PSSR, Actions)
│
├── demo/                  # Synthetic Demo Pages
│   └── test-pages/
│       ├── login.html     # Login form demo
│       ├── pii-form.html  # PII & ID form demo
│       └── dashboard.html # Analytics dashboard demo
│
├── benchmark/             # PPSB v1.0 Framework Structure
│   ├── dataset/
│   ├── runners/
│   ├── metrics/
│   └── configs/
│
├── docs/                  # Architecture & Privacy Specifications
│   ├── architecture.md
│   ├── privacy-model.md
│   ├── threat-model.md
│   └── benchmark-spec.md
│
├── docker/                # Docker compose orchestration
├── README.md
└── .gitignore
```

---

## Prerequisites

- **Node.js**: v18.0.0+ (Tested on v24.14.1)
- **Python**: 3.10+ (Tested on 3.14.4)
- **Google Chrome**: Manifest V3 compliant browser

---

## Installation & Setup Instructions

### 1. Set Up & Run the FastAPI Server

```powershell
# Navigate to workspace root
cd d:\codesss\Blindspot

# Create and activate Python virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1

# Install server dependencies
pip install -r server/requirements.txt

# Launch FastAPI agent server in reload mode
uvicorn server.app.main:app --host 0.0.0.0 --port 8000 --reload
```

Verify server health in your browser or terminal:
```powershell
curl http://localhost:8000/health
# Response: {"status":"ok","service":"blindspot-agent-server","mode":"MOCK_MODE"}
```

---

### 2. Build the Chrome Extension

```powershell
# Navigate to extension directory
cd extension

# Install Node dependencies
npm install

# Build production extension package into dist/
npm run build
```

This generates `extension/dist/` containing `manifest.json`, `content/content.js`, `background/service-worker.js`, and `src/popup/popup.html`.

---

### 3. Load Extension into Chrome

1. Open Google Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in upper right corner).
3. Click **Load unpacked**.
4. Select the directory: `d:\codesss\Blindspot\extension\dist` (or `extension`).
5. Confirm "Blindspot — Privacy-Preserving Vision Agent" appears in your extension list.

---

### 4. Running MOCK MODE & Testing Flow

1. Open any of the local demo pages in Chrome:
   - `file:///d:/codesss/Blindspot/demo/test-pages/login.html`
   - `file:///d:/codesss/Blindspot/demo/test-pages/pii-form.html`
   - `file:///d:/codesss/Blindspot/demo/test-pages/dashboard.html`
2. Click the **Blindspot Extension Icon** in the browser toolbar.
3. Check status indicator: Should show **Server Connected**.
4. Click **🚀 Run Agent Step**.
5. Observe execution:
   - Content script inspects the page DOM and detects sensitive inputs.
   - Privacy Firewall replaces sensitive input values with `[PASSWORD]`, `[EMAIL]`, `[REDACTED]`.
   - PSSR payload is transmitted safely to `http://localhost:8000/api/agent/step`.
   - Deterministic **Mock Planner** returns a validated action (e.g. `focus` or `click`).
   - Content script receives and executes the action locally.

---

## Unit Testing

Run Python server unit tests:
```powershell
.\venv\Scripts\python.exe -m pytest server/tests
```

---

## Phase 1 Limitations & Future Phases

### Current Phase 1 Limitations
- Agent planner operates in **MOCK MODE** using rule-based deterministic logic.
- Local ML inference models (ONNX Runtime, WebGPU OCR, SCRFD face detector) are represented by clean interface stubs.

### Future Phases
- **Phase 2**: Benchmarking & Local ML Integration (PP-OCRv6, SCRFD face detection, UI detector).
- **Phase 3**: Server VLM Adapter Integration (UI-TARS / Qwen3-VL).
- **Phase 4**: Full Autonomous Agent Loop & PPSB Benchmark Execution.
