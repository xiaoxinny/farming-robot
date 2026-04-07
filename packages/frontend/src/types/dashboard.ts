// Time series
export interface TimeSeriesPoint {
  timestamp: string;
  value: number;
}

export interface SensorTimeSeries {
  sensor_type: string;
  unit: string;
  points: TimeSeriesPoint[];
}

export interface TimeSeriesResponse {
  data: SensorTimeSeries[];
}

// Trends
export interface TrendPoint {
  hour: string;
  value: number;
}

export interface MetricTrend {
  metric: string;
  unit: string;
  current_value: number;
  points: TrendPoint[];
}

export interface TrendsResponse {
  data: MetricTrend[];
}

// Weather
export interface CurrentWeather {
  temperature: number;
  humidity: number;
  wind_speed: number;
  condition: string;
  location: string;
}

export interface DailyForecast {
  date: string;
  high: number;
  low: number;
  condition: string;
  humidity: number;
}

export interface CurrentWeatherResponse {
  data: CurrentWeather;
}

export interface ForecastResponse {
  data: DailyForecast[];
}

// Crop Health
export interface ZoneCropHealth {
  zone_id: string;
  zone_name: string;
  crop_type: string;
  health_status: "healthy" | "needs_attention" | "critical";
  growth_stage: string;
  last_inspection: string;
  notes: string;
}

export interface CropHealthResponse {
  data: ZoneCropHealth[];
}

// Robot Fleet
export interface Robot {
  robot_id: string;
  name: string;
  type: "drone" | "ground_rover" | "harvester";
  status: "active" | "idle" | "charging" | "maintenance";
  assigned_zone: string;
  battery_level: number;
}

export interface RobotStatusSummary {
  active: number;
  idle: number;
  charging: number;
  maintenance: number;
}

export interface RobotFleetResponse {
  summary: RobotStatusSummary;
  data: Robot[];
}

// Isaac Sim
export interface IsaacSimConfig {
  host: string;
  port: number;
  streamUrl: string;
}

export type ConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

export interface SimulationScenario {
  scenario_id: string;
  name: string;
  description: string;
  robot_type: string;
  estimated_duration_minutes: number;
}

export interface ScenariosResponse {
  data: SimulationScenario[];
}
