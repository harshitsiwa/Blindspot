# Privacy Model & Data Boundary Specification — SIH26171 (Blindspot)

## Privacy Foundation

Browser automation agents require visual and structural context to navigate UI elements effectively. However, raw browser screens contain critical Personally Identifiable Information (PII) including:
- Passwords & Passcodes
- Email Addresses
- Telephone Numbers
- Names & Addresses
- Financial Information (PAN, Aadhaar, Credit Cards, Account Numbers)
- Government Identifiers
- User Faces & Private Documents

Blindspot enforces a **Hard Trust Boundary** to eliminate privacy leakage.

```
                     LOCAL MACHINE
                          │
   RAW SCREEN ────────────┤
   RAW DOM ───────────────┤
   RAW OCR ───────────────┤
   RAW PII ───────────────┤
                          ▼
                 PRIVACY FIREWALL
                          │
                 ═════════════════
                 TRUST BOUNDARY
                 ═════════════════
                          │
                          ▼
                   SANITIZED DATA (PSSR)
                          │
                          ▼
                       SERVER
```

---

## Local vs Network Data Matrix

| Data Category | Local Browser | Network Payload (PSSR) | Remote Server |
| :--- | :---: | :---: | :---: |
| **Raw Input Values** | Retained in DOM | 🚫 **NEVER** | 🚫 **NEVER** |
| **Passwords / Passcodes** | Retained in DOM | 🚫 Replaced with `[PASSWORD]` | 🚫 **NEVER** |
| **Emails / Telephones** | Retained in DOM | 🚫 Replaced with `[EMAIL]`/`[PHONE]` | 🚫 **NEVER** |
| **Financial / Govt IDs** | Retained in DOM | 🚫 Replaced with `[PAN_NUMBER]`/`[AADHAAR_NUMBER]` | 🚫 **NEVER** |
| **User Faces** | Local Canvas Blur | 🚫 Masked / Blacked out | 🚫 **NEVER** |
| **DOM Element IDs** | Mapped (`e1`, `e2`) | Anonymous `e1`, `e2` | Received for action target |
| **Viewport Dimensions** | Read from Window | Transmitted in `PageInfo` | Received for spatial reasoning |

---

## Privacy Firewall Guarantee

1. **Fail-Closed Default**: If an input field or attribute sensitivity is ambiguous, the Privacy Firewall defaults to marking the field as sensitive and replacing its value with `[REDACTED]`.
2. **API Client Scoping**: The client method `apiClient.sendPSSR(pssr)` strictly rejects accepting raw un-sanitized DOM objects or un-redacted screenshots.
3. **Safe Logging Directive**: Application logs omit raw string inputs. Sensitive values are logged as tokens (`[EMAIL]`, `[PASSWORD]`).
