import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from server.app.api import agent

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

app = FastAPI(
    title="Blindspot — Privacy-Preserving Vision Agent Server (SIH26171)",
    version="0.1.0",
    description="Backend reasoning service for Privacy-Preserving Vision Agent",
)

# Enable CORS for Chrome Extension & local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(agent.router)


@app.get("/health", tags=["Health"])
async def health_check():
    """
    Health check endpoint returning system operational status.
    """
    return {"status": "ok", "service": "blindspot-agent-server", "mode": "MOCK_MODE"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
