"""Main API router that aggregates all sub-routers."""

from fastapi import APIRouter

from app.api.auth import router as auth_router
from app.api.farms import router as farms_router
from app.api.simulations import router as simulations_router

router = APIRouter(prefix="/api")

# Auth
router.include_router(auth_router)

# Farms
router.include_router(farms_router)

# Simulations
router.include_router(simulations_router)


@router.get("/health")
async def health_check() -> dict:
    """Basic health check endpoint."""
    return {"status": "ok"}
