from server.app.schemas.actions import PSSR

SYSTEM_PROMPT = """You are a Privacy-Preserving Vision Agent.
You receive a Privacy-Preserving Screen Representation (PSSR) containing sanitized DOM nodes where sensitive user PII, passwords, emails, and credentials have been redacted.

Your task is to analyze the page context and generate a single valid JSON Action.
Supported Actions: click, type, scroll, select, navigate, focus, back, wait.
Prohibited: execute_code, eval, arbitrary script execution.
"""

def function_build_vlm_prompt(pssr: PSSR, user_goal: str) -> str:
    dom_summary = []
    for el in pssr.dom:
        dom_summary.append(f"[{el.id}] {el.type} (role: {el.role}, label: '{el.label}', text: '{el.text}')")

    elements_text = "\n".join(dom_summary[:30])
    return f"{SYSTEM_PROMPT}\nUser Goal: {user_goal}\nPage Title: {pssr.page.title}\nURL: {pssr.page.url}\nElements:\n{elements_text}"
