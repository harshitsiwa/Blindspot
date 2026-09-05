import logging
from fastapi import APIRouter, HTTPException, status
from server.app.schemas.actions import AgentRequest, AgentResponse
from server.app.agent.planner import mock_planner

router = APIRouter(prefix="/api/agent", tags=["Agent"])
logger = logging.getLogger("blindspot.api")


@router.post("/step", response_model=AgentResponse)
async def step_agent(request: AgentRequest) -> AgentResponse:
    """
    Receives a Privacy-Preserving Screen Representation (PSSR) payload from the browser extension,
    passes it to the agent planner (MOCK MODE in Phase 1), and returns a validated browser action.
    """
    try:
        logger.info(f"Received agent step request for page: {request.pssr.page.url}")

        # Verify that sensitive fields count was received
        redaction_summary = request.pssr.redaction_summary
        logger.info(
            f"PSSR Redaction Summary: {redaction_summary.totalElements} elements, {redaction_summary.sensitiveCount} sensitive fields redacted."
        )

        response = mock_planner.plan_next_action(
            pssr=request.pssr,
            task_prompt=request.task_prompt or "Perform page action",
        )

        return response
    except Exception as e:
        logger.error(f"Error processing agent step: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Agent planner processing error: {str(e)}",
        )
