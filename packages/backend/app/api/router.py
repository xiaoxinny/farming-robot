"""Main API router that aggregates all sub-routers."""

from fastapi import APIRouter

from app.api.auth import router as auth_router
from app.api.crops import router as crops_router
from app.api.farms import router as farms_router
from app.api.robots import router as robots_router
from app.api.simulations import router as simulations_router
from app.api.weather import router as weather_router

router = APIRouter(prefix="/api")

# Auth
router.include_router(auth_router)

# Crops
router.include_router(crops_router)

# Farms
router.include_router(farms_router)

# Robots
router.include_router(robots_router)

# Simulations
router.include_router(simulations_router)

# Weather
router.include_router(weather_router)


@router.get("/health")
async def health_check() -> dict:
    """Basic health check endpoint."""
    return {"status": "ok"}
