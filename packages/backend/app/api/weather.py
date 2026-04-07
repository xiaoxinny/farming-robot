"""Weather data endpoints — current conditions and forecast."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.core.deps import get_current_user

router = APIRouter(prefix="/weather", tags=["weather"])


# ---------------------------------------------------------------------------
# Response models
# ---------------------------------------------------------------------------


class CurrentWeather(BaseModel):
    """Current weather conditions."""

    temperature: float = Field(
        ..., description="Temperature in °C"
    )
    humidity: float = Field(
        ..., description="Humidity in %"
    )
    wind_speed: float = Field(
        ..., description="Wind speed in km/h"
    )
    condition: str = Field(
        ...,
        description=(
            "Weather condition: sunny, cloudy, rainy,"
            " partly_cloudy, thunderstorm"
        ),
    )
    location: str = Field(
        ..., description="Location name"
    )


class DailyForecast(BaseModel):
    """A single day's forecast."""

    date: str = Field(..., description="ISO date string")
    high: float = Field(..., description="High temperature in °C")
    low: float = Field(..., description="Low temperature in °C")
    condition: str = Field(
        ..., description="Weather condition"
    )
    humidity: float = Field(
        ..., description="Humidity in %"
    )


class CurrentWeatherResponse(BaseModel):
    """Response wrapper for current weather."""

    data: CurrentWeather


class ForecastResponse(BaseModel):
    """Response wrapper for forecast."""

    data: list[DailyForecast]


# ---------------------------------------------------------------------------
# Mock data
# ---------------------------------------------------------------------------

_NOW = datetime(2025, 1, 15, 10, 30, 0, tzinfo=timezone.utc)

_MOCK_CURRENT = CurrentWeather(
    temperature=31.2,
    humidity=78.0,
    wind_speed=12.5,
    condition="partly_cloudy",
    location="Singapore, Lim Chu Kang",
)

_CONDITIONS = [
    "sunny",
    "partly_cloudy",
    "cloudy",
    "rainy",
    "thunderstorm",
]

_MOCK_FORECAST: list[DailyForecast] = [
    DailyForecast(
        date=(_NOW + timedelta(days=1)).date().isoformat(),
        high=34.0,
        low=25.0,
        condition="sunny",
        humidity=65.0,
    ),
    DailyForecast(
        date=(_NOW + timedelta(days=2)).date().isoformat(),
        high=33.0,
        low=26.0,
        condition="partly_cloudy",
        humidity=72.0,
    ),
    DailyForecast(
        date=(_NOW + timedelta(days=3)).date().isoformat(),
        high=30.0,
        low=25.0,
        condition="rainy",
        humidity=88.0,
    ),
    DailyForecast(
        date=(_NOW + timedelta(days=4)).date().isoformat(),
        high=32.0,
        low=26.0,
        condition="thunderstorm",
        humidity=90.0,
    ),
    DailyForecast(
        date=(_NOW + timedelta(days=5)).date().isoformat(),
        high=35.0,
        low=24.0,
        condition="sunny",
        humidity=60.0,
    ),
]


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get(
    "/current", response_model=CurrentWeatherResponse
)
async def get_current_weather(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> CurrentWeatherResponse:
    """Return current weather conditions for the farm."""
    return CurrentWeatherResponse(data=_MOCK_CURRENT)


@router.get(
    "/forecast", response_model=ForecastResponse
)
async def get_weather_forecast(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> ForecastResponse:
    """Return 5-day weather forecast for the farm."""
    return ForecastResponse(data=_MOCK_FORECAST)
