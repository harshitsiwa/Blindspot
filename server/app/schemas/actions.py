from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator, ConfigDict


class ActionTypeEnum(str, Enum):
    CLICK = "click"
    TYPE = "type"
    SCROLL = "scroll"
    SELECT = "select"
    NAVIGATE = "navigate"
    FOCUS = "focus"
    BACK = "back"
    WAIT = "wait"


class BoundingBox(BaseModel):

    x: float
    y: float
    width: float
    height: float


class ViewportDimensions(BaseModel):
    width: float
    height: float


class PageInfo(BaseModel):
    title: str
    url: str
    viewport: ViewportDimensions


class DOMElement(BaseModel):
    id: str
    type: str
    role: str
    label: str
    text: str
    value: Optional[str] = None
    bbox: BoundingBox
    visible: bool
    enabled: bool
    sensitive: bool


class RedactionSummary(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    totalElements: int = Field(..., alias="totalElements")
    sensitiveCount: int = Field(..., alias="sensitiveCount")
    redactedFields: List[str] = Field(default_factory=list, alias="redactedFields")



class PSSR(BaseModel):
    page: PageInfo
    dom: List[DOMElement]
    visual_context: Optional[Dict[str, Any]] = None
    redaction_summary: RedactionSummary
    screenshot: Optional[str] = None


class Action(BaseModel):
    action: ActionTypeEnum
    target: Optional[str] = None
    value: Optional[str] = None

    @field_validator("action")
    def validate_action_not_prohibited(cls, v: ActionTypeEnum) -> ActionTypeEnum:
        if v.value in ["execute_code", "eval", "script"]:
            raise ValueError(f"Action '{v.value}' is strictly forbidden by privacy & security policy.")
        return v


class AgentRequest(BaseModel):
    pssr: PSSR
    task_prompt: Optional[str] = "Interact with page safely"


class AgentResponse(BaseModel):
    status: str = "ok"
    message: str
    action: Optional[Action] = None
    planner_mode: str = "mock"
