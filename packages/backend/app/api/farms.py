"""Farm data endpoints — overview, sensors, and alerts."""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.core.deps import get_current_user

router = APIRouter(prefix="/farms", tags=["farms"])


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------


class SensorType(str, Enum):
    """Supported sensor types."""

    temperature = "temperature"
    humidity = "humidity"
    soil_moisture = "soil_moisture"
    light = "light"


class AlertSeverity(str, Enum):
    """Alert severity levels."""

    info = "info"
    warning = "warning"
    critical = "critical"


# ---------------------------------------------------------------------------
# Response models
# ---------------------------------------------------------------------------


class MetricsSummary(BaseModel):
    """Aggregated farm metrics."""

    avg_temperature: float = Field(..., description="Average temperature in °C")
    avg_humidity: float = Field(..., description="Average humidity in %")
    avg_soil_moisture: float = Field(..., description="Average soil moisture in %")
    active_alerts: int = Field(..., ge=0, description="Number of active alerts")


class FarmOverview(BaseModel):
    """High-level farm information."""

    farm_id: str
    name: str
    location: str
    status: str
    metrics: MetricsSummary


class SensorReading(BaseModel):
    """A single sensor reading."""

    sensor_id: str
    type: SensorType
    value: float
    unit: str
    timestamp: datetime


class Alert(BaseModel):
    """An active farm alert."""

    alert_id: str
    severity: AlertSeverity
    message: str
    timestamp: datetime
    acknowledged: bool


class FarmOverviewResponse(BaseModel):
    """Response wrapper for farm overview."""

    data: FarmOverview


class SensorReadingsResponse(BaseModel):
    """Response wrapper for sensor readings."""

    data: list[SensorReading]


class AlertsResponse(BaseModel):
    """Response wrapper for alerts."""

    data: list[Alert]


# ---------------------------------------------------------------------------
# Mock data
# ---------------------------------------------------------------------------

_NOW = datetime(2025, 1, 15, 10, 30, 0, tzinfo=timezone.utc)

_MOCK_OVERVIEW = FarmOverview(
    farm_id="farm-001",
    name="Green Valley Farm",
    location="Singapore, Lim Chu Kang",
    status="operational",
    metrics=MetricsSummary(
        avg_temperature=28.5,
        avg_humidity=72.3,
        avg_soil_moisture=45.1,
        active_alerts=2,
    ),
)

_MOCK_SENSORS: list[SensorReading] = [
    SensorReading(
        sensor_id="sensor-t01",
        type=SensorType.temperature,
        value=28.5,
        unit="°C",
        timestamp=_NOW,
    ),
    SensorReading(
        sensor_id="sensor-h01",
        type=SensorType.humidity,
        value=72.3,
        unit="%",
        timestamp=_NOW,
    ),
    SensorReading(
        sensor_id="sensor-sm01",
        type=SensorType.soil_moisture,
        value=45.1,
        unit="%",
        timestamp=_NOW,
    ),
    SensorReading(
        sensor_id="sensor-l01",
        type=SensorType.light,
        value=850.0,
        unit="lux",
        timestamp=_NOW,
    ),
]

_MOCK_ALERTS: list[Alert] = [
    Alert(
        alert_id="alert-001",
        severity=AlertSeverity.warning,
        message="Soil moisture below optimal threshold in Zone B",
        timestamp=_NOW,
        acknowledged=False,
    ),
    Alert(
        alert_id="alert-002",
        severity=AlertSeverity.critical,
        message="Temperature spike detected in Greenhouse 3",
        timestamp=_NOW,
        acknowledged=False,
    ),
    Alert(
        alert_id="alert-003",
        severity=AlertSeverity.info,
        message="Scheduled irrigation completed for Zone A",
        timestamp=_NOW,
        acknowledged=True,
    ),
]


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("/overview", response_model=FarmOverviewResponse)
async def get_farm_overview(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> FarmOverviewResponse:
    """Return high-level farm overview with aggregated metrics."""
    return FarmOverviewResponse(data=_MOCK_OVERVIEW)


@router.get("/sensors", response_model=SensorReadingsResponse)
async def get_sensor_readings(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> SensorReadingsResponse:
    """Return the latest sensor readings across all sensor types."""
    return SensorReadingsResponse(data=_MOCK_SENSORS)


@router.get("/alerts", response_model=AlertsResponse)
async def get_alerts(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> AlertsResponse:
    """Return active farm alerts ordered by severity."""
    return AlertsResponse(data=_MOCK_ALERTS)
