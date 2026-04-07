"""Farm data endpoints — overview, sensors, and alerts."""

from __future__ import annotations

import math
import random
from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Any

from fastapi import APIRouter, Depends, Query
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
# Time-series models
# ---------------------------------------------------------------------------


class TimeSeriesPoint(BaseModel):
    """A single time-series data point."""

    timestamp: datetime
    value: float


class SensorTimeSeries(BaseModel):
    """Time-series data for one sensor type."""

    sensor_type: SensorType
    unit: str
    points: list[TimeSeriesPoint]


class TimeSeriesResponse(BaseModel):
    """Response wrapper for sensor time-series data."""

    data: list[SensorTimeSeries]


# ---------------------------------------------------------------------------
# Trend models
# ---------------------------------------------------------------------------


class TrendPoint(BaseModel):
    """A single trend data point."""

    hour: str
    value: float


class MetricTrend(BaseModel):
    """Trend data for one metric."""

    metric: str
    unit: str
    current_value: float
    points: list[TrendPoint]


class TrendsResponse(BaseModel):
    """Response wrapper for trends data."""

    data: list[MetricTrend]


# ---------------------------------------------------------------------------
# Mock data generators
# ---------------------------------------------------------------------------

# Realistic sensor ranges
_SENSOR_RANGES: dict[SensorType, tuple[float, float, str]] = {
    SensorType.temperature: (20.0, 35.0, "°C"),
    SensorType.humidity: (50.0, 90.0, "%"),
    SensorType.soil_moisture: (30.0, 70.0, "%"),
    SensorType.light: (200.0, 1000.0, "lux"),
}


def _generate_timeseries(
    sensor_type: SensorType,
    hours: int,
    base_time: datetime,
) -> SensorTimeSeries:
    """Generate mock time-series data for a sensor type.

    Produces one point every 30 minutes for the given number of hours,
    with values within realistic agricultural ranges. A sine wave with
    random noise creates natural-looking variation.
    """
    low, high, unit = _SENSOR_RANGES[sensor_type]
    mid = (low + high) / 2.0
    amplitude = (high - low) / 2.0
    num_points = hours * 2  # 30-min intervals
    rng = random.Random(42 + hash(sensor_type))  # deterministic per type

    points: list[TimeSeriesPoint] = []
    start = base_time - timedelta(hours=hours)
    for i in range(num_points):
        ts = start + timedelta(minutes=30 * i)
        # Sine wave for diurnal pattern + small noise
        phase = (i / num_points) * 2 * math.pi
        noise = rng.uniform(-0.05, 0.05) * amplitude
        value = mid + amplitude * 0.6 * math.sin(phase) + noise
        # Clamp to range
        value = max(low, min(high, round(value, 1)))
        points.append(TimeSeriesPoint(timestamp=ts, value=value))

    return SensorTimeSeries(sensor_type=sensor_type, unit=unit, points=points)


def _generate_trends(base_time: datetime) -> list[MetricTrend]:
    """Generate 12 hourly trend points for each metric.

    Returns trend data for temperature, humidity, soil_moisture, and
    active_alerts suitable for sparkline rendering.
    """
    rng = random.Random(99)
    metrics: list[MetricTrend] = []

    metric_configs: list[tuple[str, str, float, float, float]] = [
        ("temperature", "°C", 20.0, 35.0, 28.5),
        ("humidity", "%", 50.0, 90.0, 72.3),
        ("soil_moisture", "%", 30.0, 70.0, 45.1),
        ("active_alerts", "count", 0.0, 10.0, 2.0),
    ]

    for metric_name, unit, low, high, current in metric_configs:
        points: list[TrendPoint] = []
        mid = (low + high) / 2.0
        amplitude = (high - low) / 2.0

        for i in range(12):
            hour_dt = base_time - timedelta(hours=11 - i)
            hour_label = hour_dt.strftime("%H:%M")
            phase = (i / 12) * 2 * math.pi
            noise = rng.uniform(-0.05, 0.05) * amplitude
            value = mid + amplitude * 0.4 * math.sin(phase) + noise
            value = max(low, min(high, round(value, 1)))
            points.append(TrendPoint(hour=hour_label, value=value))

        metrics.append(
            MetricTrend(
                metric=metric_name,
                unit=unit,
                current_value=current,
                points=points,
            )
        )

    return metrics


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

_SEVERITY_ORDER: dict[AlertSeverity, int] = {
    AlertSeverity.critical: 0,
    AlertSeverity.warning: 1,
    AlertSeverity.info: 2,
}


def sort_alerts_by_severity(
    alerts: list[Alert],
) -> list[Alert]:
    """Sort alerts by severity: critical → warning → info."""
    return sorted(
        alerts,
        key=lambda a: _SEVERITY_ORDER[a.severity],
    )


_MOCK_ALERTS: list[Alert] = [
    Alert(
        alert_id="alert-001",
        severity=AlertSeverity.warning,
        message="Soil moisture below optimal threshold in Zone B",
        timestamp=_NOW - timedelta(minutes=45),
        acknowledged=False,
    ),
    Alert(
        alert_id="alert-002",
        severity=AlertSeverity.critical,
        message="Temperature spike detected in Greenhouse 3",
        timestamp=_NOW - timedelta(minutes=10),
        acknowledged=False,
    ),
    Alert(
        alert_id="alert-003",
        severity=AlertSeverity.info,
        message="Scheduled irrigation completed for Zone A",
        timestamp=_NOW - timedelta(hours=2),
        acknowledged=True,
    ),
    Alert(
        alert_id="alert-004",
        severity=AlertSeverity.critical,
        message="Pest infestation detected in Zone D — aphids",
        timestamp=_NOW - timedelta(minutes=5),
        acknowledged=False,
    ),
    Alert(
        alert_id="alert-005",
        severity=AlertSeverity.critical,
        message="Irrigation pump failure on Circuit 2",
        timestamp=_NOW - timedelta(minutes=20),
        acknowledged=False,
    ),
    Alert(
        alert_id="alert-006",
        severity=AlertSeverity.warning,
        message="Soil nitrogen levels low in Zone C",
        timestamp=_NOW - timedelta(hours=1),
        acknowledged=False,
    ),
    Alert(
        alert_id="alert-007",
        severity=AlertSeverity.warning,
        message="Harvester R-03 requires maintenance",
        timestamp=_NOW - timedelta(minutes=30),
        acknowledged=False,
    ),
    Alert(
        alert_id="alert-008",
        severity=AlertSeverity.info,
        message="Weather advisory: heavy rain expected tomorrow",
        timestamp=_NOW - timedelta(hours=3),
        acknowledged=True,
    ),
    Alert(
        alert_id="alert-009",
        severity=AlertSeverity.warning,
        message="High humidity may promote fungal growth in Zone A",
        timestamp=_NOW - timedelta(minutes=55),
        acknowledged=False,
    ),
    Alert(
        alert_id="alert-010",
        severity=AlertSeverity.info,
        message="Drone D-02 patrol completed — no anomalies",
        timestamp=_NOW - timedelta(hours=1, minutes=30),
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
    return AlertsResponse(
        data=sort_alerts_by_severity(_MOCK_ALERTS),
    )


@router.get("/sensors/timeseries", response_model=TimeSeriesResponse)
async def get_sensor_timeseries(
    sensor_type: SensorType | None = Query(default=None, description="Filter by sensor type"),
    hours: int = Query(default=24, ge=1, le=168, description="Number of hours of data"),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> TimeSeriesResponse:
    """Return time-series sensor data at 30-minute intervals."""
    types = [sensor_type] if sensor_type else list(SensorType)
    series = [_generate_timeseries(st, hours, _NOW) for st in types]
    return TimeSeriesResponse(data=series)


@router.get("/trends", response_model=TrendsResponse)
async def get_trends(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> TrendsResponse:
    """Return sparkline trend data for dashboard metric cards."""
    return TrendsResponse(data=_generate_trends(_NOW))
