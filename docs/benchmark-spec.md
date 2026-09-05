# Privacy-Preserving Screen Benchmark (PPSB v1.0) Specification

## Overview

The **Privacy-Preserving Screen Benchmark (PPSB v1.0)** is designed to evaluate local perception models, privacy firewall accuracy, PII redaction coverage, and visual agent reasoning under privacy constraints.

---

## Benchmark Categories

1. **Category A: Authentication & Login Pages**
   - Evaluates detection and 100% redaction of password, OTP, and session credential inputs.
2. **Category B: Financial & Government Identity Forms**
   - Evaluates local detection of PAN cards, Aadhaar numbers, credit card fields, and SSN formats.
3. **Category C: E-Commerce & Checkout Portals**
   - Evaluates mixed forms with shipping addresses, phone numbers, and payment inputs.
4. **Category D: Dashboard & Data Visualizations**
   - Evaluates element extraction precision on non-sensitive structural charts, tables, and buttons.

---

## Key Performance Metrics

### 1. Privacy Metrics
- **PII Leak Rate (PLR)**: Percentage of un-redacted sensitive fields crossing network boundary (Must be `0.00%`).
- **Redaction Recall (RR)**: Ratio of correctly redacted sensitive fields over total sensitive fields present.
- **Redaction Precision (RP)**: Ratio of correctly redacted sensitive fields over total fields flagged sensitive.

### 2. Efficiency Metrics
- **Perception Latency (ms)**: Time taken to scan DOM, detect sensitive elements, and construct PSSR.
- **Memory Footprint (MB)**: Browser content script and service worker RAM consumption.

### 3. Agent Task Metrics
- **Action Success Rate (ASR)**: Ratio of completed tasks without invalid action rejections.

---

## Dataset Annotation Schema

```json
{
  "image_id": "login_001.png",
  "page_url": "http://localhost/demo/login.html",
  "annotations": [
    {
      "element_id": "e1",
      "bbox": [100, 150, 300, 40],
      "type": "email",
      "is_sensitive": true,
      "expected_token": "[EMAIL]"
    },
    {
      "element_id": "e2",
      "bbox": [100, 210, 300, 40],
      "type": "password",
      "is_sensitive": true,
      "expected_token": "[PASSWORD]"
    }
  ]
}
```
