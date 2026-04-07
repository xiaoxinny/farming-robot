"""Crop health endpoints — zone-level crop status data."""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.core.deps import get_current_user

router = APIRouter(prefix="/crops", tags=["crops"])


# ---------------------------------------------------------------------------
# Response models
# ---------------------------------------------------------------------------


class HealthStatus(str, Enum):
    """Crop health status levels."""

    healthy = "healthy"
    needs_attention = "needs_attention"
    critical = "critical"


class ZoneCropHealth(BaseModel):
    """Health data for a single farm zone."""

    zone_id: str = Field(..., description="Unique zone identifier")
    zone_name: str = Field(..., description="Human-readable zone name")
    crop_type: str = Field(..., description="Primary crop grown in this zone")
    health_status: HealthStatus = Field(
        ..., description="Overall health status"
    )
    growth_stage: str = Field(
        ..., description="Current growth stage of the crop"
    )
    last_inspection: datetime = Field(
        ..., description="Timestamp of last inspection"
    )
    notes: str = Field(..., description="Inspector notes")


class CropHealthResponse(BaseModel):
    """Response wrapper for crop health data."""

    data: list[ZoneCropHealth]


# ---------------------------------------------------------------------------
# Mock data
# ---------------------------------------------------------------------------

_MOCK_CROP_HEALTH: list[ZoneCropHealth] = [
    ZoneCropHealth(
        zone_id="zone-1",
        zone_name="North Greenhouse A",
        crop_type="Lettuce",
        health_status=HealthStatus.healthy,
        growth_stage="Mature",
        last_inspection=datetime(2025, 1, 15, 8, 0, 0, tzinfo=timezone.utc),
        notes="Leaves are vibrant green, no signs of pest damage.",
    ),
    ZoneCropHealth(
        zone_id="zone-2",
        zone_name="North Greenhouse B",
        crop_type="Tomatoes",
        health_status=HealthStatus.needs_attention,
        growth_stage="Flowering",
        last_inspection=datetime(2025, 1, 14, 14, 30, 0, tzinfo=timezone.utc),
        notes=(
            "Minor aphid presence detected on lower leaves."
            " Monitor closely."
        ),
    ),
    ZoneCropHealth(
        zone_id="zone-3",
        zone_name="South Field 1",
        crop_type="Basil",
        health_status=HealthStatus.healthy,
        growth_stage="Vegetative",
        last_inspection=datetime(2025, 1, 15, 9, 15, 0, tzinfo=timezone.utc),
        notes="Strong growth, aromatic oils developing well.",
    ),
    ZoneCropHealth(
        zone_id="zone-4",
        zone_name="South Field 2",
        crop_type="Kale",
        health_status=HealthStatus.critical,
        growth_stage="Seedling",
        last_inspection=datetime(2025, 1, 15, 7, 45, 0, tzinfo=timezone.utc),
        notes=(
            "Severe wilting observed."
            " Irrigation system malfunction suspected."
        ),
    ),
    ZoneCropHealth(
        zone_id="zone-5",
        zone_name="East Polytunnel",
        crop_type="Strawberries",
        health_status=HealthStatus.needs_attention,
        growth_stage="Fruiting",
        last_inspection=datetime(2025, 1, 14, 16, 0, 0, tzinfo=timezone.utc),
        notes=(
            "Some fruit showing early signs of grey mould."
            " Increase ventilation."
        ),
    ),
    ZoneCropHealth(
        zone_id="zone-6",
        zone_name="West Hydroponic Bay",
        crop_type="Peppers",
        health_status=HealthStatus.healthy,
        growth_stage="Flowering",
        last_inspection=datetime(2025, 1, 15, 10, 0, 0, tzinfo=timezone.utc),
        notes="Nutrient levels optimal, flowers setting well.",
    ),
]


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("/health", response_model=CropHealthResponse)
async def get_crop_health(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> CropHealthResponse:
    """Return crop health data for all farm zones."""
    return CropHealthResponse(data=_MOCK_CROP_HEALTH)
