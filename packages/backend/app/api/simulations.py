"""Simulation content endpoints — metadata and S3 signed URL generation."""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.api.robots import RobotType
from app.core.deps import get_current_user

router = APIRouter(prefix="/simulations", tags=["simulations"])


# ---------------------------------------------------------------------------
# Enums & Models
# ---------------------------------------------------------------------------


class MediaType(str, Enum):
    """Supported simulation media types."""

    video = "video"
    image_sequence = "image_sequence"


class SimulationMetadata(BaseModel):
    """Core simulation metadata."""

    id: str
    title: str
    description: str
    media_type: MediaType
    created_at: datetime


class SimulationResponse(BaseModel):
    """Simulation metadata with a presigned S3 URL for media access."""

    metadata: SimulationMetadata
    signed_url: str = Field(..., description="Presigned S3 URL for the media content")


class SimulationListResponse(BaseModel):
    """Response wrapper for listing simulations."""

    data: list[SimulationMetadata]


class SimulationScenario(BaseModel):
    """A predefined Isaac Sim simulation scenario."""

    scenario_id: str
    name: str
    description: str
    robot_type: RobotType
    estimated_duration_minutes: int


class ScenariosResponse(BaseModel):
    """Response wrapper for simulation scenarios."""

    data: list[SimulationScenario]


# ---------------------------------------------------------------------------
# Mock data
# ---------------------------------------------------------------------------

_NOW = datetime(2025, 1, 15, 12, 0, 0, tzinfo=timezone.utc)

_MOCK_SIMULATIONS: dict[str, SimulationMetadata] = {
    "sim-001": SimulationMetadata(
        id="sim-001",
        title="Greenhouse Pest Detection Sweep",
        description="Simulated drone sweep of Greenhouse 3 identifying pest hotspots using thermal imaging.",
        media_type=MediaType.video,
        created_at=_NOW,
    ),
    "sim-002": SimulationMetadata(
        id="sim-002",
        title="Irrigation Coverage Analysis",
        description="Image sequence showing irrigation coverage across Zone A and Zone B.",
        media_type=MediaType.image_sequence,
        created_at=_NOW,
    ),
    "sim-003": SimulationMetadata(
        id="sim-003",
        title="Robot Navigation Path Planning",
        description="Simulated robot navigation through crop rows for automated harvesting.",
        media_type=MediaType.video,
        created_at=_NOW,
    ),
}


def _generate_mock_signed_url(simulation_id: str, media_type: MediaType) -> str:
    """Generate a fake presigned S3 URL for mock purposes.

    In production this would call boto3 `generate_presigned_url`.
    """
    ext = "mp4" if media_type == MediaType.video else "zip"
    return (
        f"https://agritech-simulations.s3.ap-southeast-1.amazonaws.com/"
        f"{simulation_id}/output.{ext}"
        f"?X-Amz-Algorithm=AWS4-HMAC-SHA256"
        f"&X-Amz-Expires=3600"
        f"&X-Amz-SignedHeaders=host"
        f"&X-Amz-Signature=mock-signature-{simulation_id}"
    )


_MOCK_SCENARIOS: list[SimulationScenario] = [
    SimulationScenario(
        scenario_id="scenario-001",
        name="Crop Inspection Drone",
        description="Automated drone flight over crop fields capturing multispectral imagery for health assessment and early disease detection.",
        robot_type=RobotType.drone,
        estimated_duration_minutes=15,
    ),
    SimulationScenario(
        scenario_id="scenario-002",
        name="Autonomous Harvester Path",
        description="Path planning and navigation simulation for an autonomous harvester operating across multiple crop rows.",
        robot_type=RobotType.harvester,
        estimated_duration_minutes=30,
    ),
    SimulationScenario(
        scenario_id="scenario-003",
        name="Pest Patrol Rover",
        description="Ground rover patrol route simulation for detecting and mapping pest infestations using onboard sensors.",
        robot_type=RobotType.ground_rover,
        estimated_duration_minutes=20,
    ),
    SimulationScenario(
        scenario_id="scenario-004",
        name="Irrigation Monitoring Drone",
        description="Drone survey simulation for monitoring irrigation coverage and identifying dry spots using thermal imaging.",
        robot_type=RobotType.drone,
        estimated_duration_minutes=25,
    ),
]


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("", response_model=SimulationListResponse)
async def list_simulations(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> SimulationListResponse:
    """Return a list of available simulations."""
    return SimulationListResponse(data=list(_MOCK_SIMULATIONS.values()))


@router.get("/scenarios", response_model=ScenariosResponse)
async def get_simulation_scenarios(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> ScenariosResponse:
    """Return predefined Isaac Sim simulation scenarios."""
    return ScenariosResponse(data=_MOCK_SCENARIOS)


@router.get("/{simulation_id}", response_model=SimulationResponse)
async def get_simulation(
    simulation_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> SimulationResponse:
    """Return simulation metadata with a presigned S3 URL for media content."""
    sim = _MOCK_SIMULATIONS.get(simulation_id)
    if not sim:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Simulation '{simulation_id}' not found",
        )
    signed_url = _generate_mock_signed_url(sim.id, sim.media_type)
    return SimulationResponse(metadata=sim, signed_url=signed_url)
