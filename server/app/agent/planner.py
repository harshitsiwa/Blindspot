import logging
from typing import Tuple
from server.app.schemas.actions import PSSR, Action, ActionTypeEnum, AgentResponse

logger = logging.getLogger("blindspot.planner")


class MockPlanner:
    """
    [MOCK MODE PLANNER]
    Deterministic agent planner used for testing architecture, privacy firewall,
    and client-server communication before connecting a full VLM model in Phase 2+.
    """

    def plan_next_action(self, pssr: PSSR, task_prompt: str = "") -> AgentResponse:
        logger.info(
            f"[MOCK MODE] Processing PSSR page '{pssr.page.title}' with {len(pssr.dom)} elements."
        )

        # 1. Search for Login button
        login_btn = self._find_element(
            pssr,
            lambda el: el.type in ["button", "submit", "a"]
            and ("login" in el.label.lower() or "log in" in el.text.lower() or "submit" in el.label.lower()),
        )

        # 2. Search for Email input
        email_input = self._find_element(
            pssr,
            lambda el: el.type == "email" or "email" in el.label.lower() or "email" in el.id.lower(),
        )

        # 3. Search for Password input
        password_input = self._find_element(
            pssr,
            lambda el: el.type == "password" or "password" in el.label.lower(),
        )

        # 4. Search for generic clickable button
        generic_btn = self._find_element(
            pssr,
            lambda el: el.type in ["button", "submit"] or el.role == "button",
        )

        chosen_action: Action

        if email_input:
            chosen_action = Action(
                action=ActionTypeEnum.FOCUS,
                target=email_input.id,
                value="[EMAIL_TARGETED]",
            )
            msg = f"Mock Planner: Found email input element '{email_input.id}'. Generated focus action."

        elif password_input:
            chosen_action = Action(
                action=ActionTypeEnum.FOCUS,
                target=password_input.id,
            )
            msg = f"Mock Planner: Found password input element '{password_input.id}'. Generated focus action."

        elif login_btn:
            chosen_action = Action(
                action=ActionTypeEnum.CLICK,
                target=login_btn.id,
            )
            msg = f"Mock Planner: Found login button '{login_btn.id}'. Generated click action."

        elif generic_btn:
            chosen_action = Action(
                action=ActionTypeEnum.CLICK,
                target=generic_btn.id,
            )
            msg = f"Mock Planner: Found interactive button '{generic_btn.id}'. Generated click action."

        else:
            chosen_action = Action(
                action=ActionTypeEnum.WAIT,
            )
            msg = "Mock Planner: No active target elements matched rules. Generated wait action."

        return AgentResponse(
            status="ok",
            message=msg,
            action=chosen_action,
            planner_mode="mock",
        )

    def _find_element(self, pssr: PSSR, predicate):
        for el in pssr.dom:
            if predicate(el):
                return el
        return None


mock_planner = MockPlanner()
