from abc import ABC, abstractmethod
from typing import Optional
from server.app.schemas.actions import PSSR, AgentResponse


class BaseVLMAdapter(ABC):
    """
    Abstract Base Class for Server-side Vision Language Model Adapters.
    """

    @abstractmethod
    async def predict_action(self, pssr: PSSR, user_prompt: str) -> AgentResponse:
        pass


class StubVLMAdapter(BaseVLMAdapter):
    """
    Placeholder VLM adapter used prior to model deployment.
    """

    async def predict_action(self, pssr: PSSR, user_prompt: str) -> AgentResponse:
        return AgentResponse(
            status="ok",
            message="VLM Model Adapter Stub - Real inference disabled in Phase 1.",
            action=None,
            planner_mode="vlm_stub",
        )
