import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["mode"] == "MOCK_MODE"


def test_agent_step_valid_pssr():
    payload = {
        "pssr": {
            "page": {
                "title": "Test Login",
                "url": "http://localhost/login.html",
                "viewport": {"width": 1440, "height": 900},
            },
            "dom": [
                {
                    "id": "e1",
                    "type": "email",
                    "role": "input",
                    "label": "Email",
                    "text": "",
                    "value": "[EMAIL]",
                    "bbox": {"x": 10, "y": 10, "width": 200, "height": 40},
                    "visible": True,
                    "enabled": True,
                    "sensitive": True,
                },
                {
                    "id": "e2",
                    "type": "password",
                    "role": "input",
                    "label": "Password",
                    "text": "",
                    "value": "[PASSWORD]",
                    "bbox": {"x": 10, "y": 60, "width": 200, "height": 40},
                    "visible": True,
                    "enabled": True,
                    "sensitive": True,
                },
                {
                    "id": "e3",
                    "type": "button",
                    "role": "button",
                    "label": "Sign In",
                    "text": "Log In",
                    "value": None,
                    "bbox": {"x": 10, "y": 110, "width": 200, "height": 40},
                    "visible": True,
                    "enabled": True,
                    "sensitive": False,
                },
            ],
            "visual_context": None,
            "redaction_summary": {
                "totalElements": 3,
                "sensitiveCount": 2,
                "redactedFields": ["e1:email", "e2:password"],
            },
            "screenshot": None,
        },
        "task_prompt": "Login to demo",
    }

    response = client.post("/api/agent/step", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["planner_mode"] == "mock"
    assert data["action"] is not None
    assert data["action"]["action"] in [
        "click",
        "type",
        "scroll",
        "select",
        "navigate",
        "focus",
        "back",
        "wait",
    ]


def test_agent_step_malformed_request():
    response = client.post("/api/agent/step", json={"invalid": "data"})
    assert response.status_code == 422


def test_action_validation_prohibits_execute_code():
    from app.schemas.actions import Action, ActionTypeEnum
    from pydantic import ValidationError

    with pytest.raises(ValidationError):
        Action(action="execute_code", target="e1")
