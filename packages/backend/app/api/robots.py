"""Robot fleet endpoints — robot status and fleet summary data."""

from __future__ import annotations

from enum import Enum
from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.core.deps import get_current_user

router = APIRouter(prefix="/robots", tags=["robots"])


# ---------------------------------------------------------------------------
# Response models
# ---------------------------------------------------------------------------


class RobotType(str, Enum):
    """Types of agricultural robots."""

    drone = "drone"
    ground_rover = "ground_rover"
    harvester = "harvester"


class RobotStatus(str, Enum):
    """Operational status of a robot."""

    active = "active"
    idle = "idle"
    charging = "charging"
    maintenance = "maintenance"


class Robot(BaseModel):
    """Status data for a single robot."""

    robot_id: str = Field(..., description="Unique robot identifier")
    name: str = Field(..., description="Human-readable robot name")
    type: RobotType = Field(..., description="Robot type")
    status: RobotStatus = Field(..., description="Current operational status")
    assigned_zone: str = Field(
        ..., description="Farm zone the robot is assigned to"
    )
    battery_level: int = Field(
        ..., ge=0, le=100, description="Battery level 0-100%"
    )


class RobotStatusSummary(BaseModel):
    """Counts of robots by status."""

    active: int = Field(..., description="Number of active robots")
    idle: int = Field(..., description="Number of idle robots")
    charging: int = Field(..., description="Number of charging robots")
    maintenance: int = Field(
        ..., description="Number of robots in maintenance"
    )


class RobotFleetResponse(BaseModel):
    """Response wrapper for robot fleet data."""

    summary: RobotStatusSummary
    data: list[Robot]


# ---------------------------------------------------------------------------
# Mock data
# ---------------------------------------------------------------------------

_MOCK_ROBOTS: list[Robot] = [
    Robot(
        robot_id="robot-1",
        name="SkyScout Alpha",
        type=RobotType.drone,
        status=RobotStatus.active,
        assigned_zone="North Greenhouse A",
        battery_level=82,
    ),
    Robot(
        robot_id="robot-2",
        name="TerraBot One",
        type=RobotType.ground_rover,
        status=RobotStatus.idle,
        assigned_zone="South Field 1",
        battery_level=65,
    ),
    Robot(
        robot_id="robot-3",
        name="HarvestMaster 3000",
        type=RobotType.harvester,
        status=RobotStatus.active,
        assigned_zone="East Polytunnel",
        battery_level=47,
    ),
    Robot(
        robot_id="robot-4",
        name="SkyScout Beta",
        type=RobotType.drone,
        status=RobotStatus.charging,
        assigned_zone="West Hydroponic Bay",
        battery_level=23,
    ),
    Robot(
        robot_id="robot-5",
        name="TerraBot Two",
        type=RobotType.ground_rover,
        status=RobotStatus.maintenance,
        assigned_zone="South Field 2",
        battery_level=15,
    ),
    Robot(
        robot_id="robot-6",
        name="SkyScout Gamma",
        type=RobotType.drone,
        status=RobotStatus.idle,
        assigned_zone="North Greenhouse B",
        battery_level=91,
    ),
]


def _compute_summary(robots: list[Robot]) -> RobotStatusSummary:
    """Compute status summary counts from a list of robots."""
    return RobotStatusSummary(
        active=sum(1 for r in robots if r.status == RobotStatus.active),
        idle=sum(1 for r in robots if r.status == RobotStatus.idle),
        charging=sum(1 for r in robots if r.status == RobotStatus.charging),
        maintenance=sum(
            1 for r in robots if r.status == RobotStatus.maintenance
        ),
    )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("/fleet", response_model=RobotFleetResponse)
async def get_robot_fleet(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> RobotFleetResponse:
    """Return robot fleet status with summary counts."""
    return RobotFleetResponse(
        summary=_compute_summary(_MOCK_ROBOTS),
        data=_MOCK_ROBOTS,
    )
