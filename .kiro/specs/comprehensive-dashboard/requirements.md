# Requirements Document

## Introduction

Enhance the existing AgriTech dashboard to be a comprehensive, production-quality dashboard with interactive charts/graphs, richer mock data across all widgets, and dedicated integration areas for NVIDIA Isaac Sim robotics simulations. The current dashboard has basic metric cards, a sensor table, an alerts list, a placeholder analytics widget, and a simple simulation list. This feature transforms it into a data-rich, visually compelling dashboard with time-series graphs, expanded mock datasets, and Isaac Sim connectivity panels.

## Glossary

- **Dashboard**: The authenticated main view of the AgriTech platform, composed of multiple widgets displaying farm data, analytics, and simulations
- **Chart_Component**: A React component that renders data as a visual graph (line chart, bar chart, area chart, etc.) using a charting library such as Recharts
- **Mock_Data_Service**: A module providing realistic, time-series agricultural data for development and demonstration purposes
- **Isaac_Sim_Panel**: A dashboard section dedicated to displaying NVIDIA Isaac Sim simulation status, connection configuration, and embedded visualization
- **NVIDIA_Isaac_Sim**: A robotics simulation platform built on NVIDIA Omniverse for designing, testing, and training AI-based robots in photorealistic environments
- **Sensor_Time_Series**: A sequence of sensor readings (temperature, humidity, soil moisture, light) recorded at regular intervals over a time period
- **Widget**: A self-contained UI section within the Dashboard that displays a specific category of information
- **Backend_API**: The FastAPI server providing farm, sensor, alert, and simulation data endpoints
- **Weather_Widget**: A dashboard component displaying current and forecasted weather conditions for the farm location
- **Crop_Health_Widget**: A dashboard component displaying crop health status across different farm zones
- **Robot_Fleet_Widget**: A dashboard component displaying the status and location of agricultural robots on the farm

## Requirements

### Requirement 1: Time-Series Charts for Sensor Data

**User Story:** As a farm operator, I want to see sensor data plotted as interactive time-series charts, so that I can visually identify trends and anomalies in temperature, humidity, soil moisture, and light levels over time.

#### Acceptance Criteria

1. WHEN the Analytics page loads, THE Chart_Component SHALL render line charts for temperature, humidity, soil moisture, and light sensor data over a 24-hour period
2. THE Backend_API SHALL provide a time-series endpoint that returns sensor readings at regular intervals for a configurable time range
3. WHEN a user hovers over a data point on a chart, THE Chart_Component SHALL display a tooltip showing the exact value, unit, and timestamp
4. THE Mock_Data_Service SHALL generate at least 24 hours of sensor readings at 30-minute intervals for each sensor type (temperature, humidity, soil moisture, light)
5. WHEN the time-series endpoint returns an error, THE Chart_Component SHALL display an error message with a retry option

### Requirement 2: Enhanced Metrics Overview with Sparkline Graphs

**User Story:** As a farm operator, I want the overview metric cards to include small sparkline graphs, so that I can see at a glance whether each metric is trending up, down, or stable.

#### Acceptance Criteria

1. THE Dashboard SHALL display metric cards for temperature, humidity, soil moisture, and active alerts, each including a sparkline graph showing the last 12 hours of data
2. THE Backend_API SHALL provide a trends endpoint that returns hourly aggregated values for each metric over the last 12 hours
3. THE Mock_Data_Service SHALL generate 12 hourly data points for each metric with realistic agricultural value ranges (temperature: 20-35°C, humidity: 50-90%, soil moisture: 30-70%)

### Requirement 3: Expanded Mock Data for Alerts

**User Story:** As a farm operator, I want to see a realistic set of alerts across different severities and categories, so that the dashboard demonstrates a production-like alert experience.

#### Acceptance Criteria

1. THE Backend_API SHALL return at least 8 mock alerts spanning info, warning, and critical severities
2. THE Mock_Data_Service SHALL include alerts for diverse agricultural scenarios: pest detection, irrigation failures, temperature extremes, equipment malfunctions, soil nutrient deficiencies, and weather warnings
3. WHEN the Alerts page loads, THE Dashboard SHALL display alerts sorted by severity (critical first, then warning, then info)

### Requirement 4: Weather Conditions Widget

**User Story:** As a farm operator, I want to see current and forecasted weather conditions on the dashboard, so that I can plan farm operations around weather patterns.

#### Acceptance Criteria

1. THE Weather_Widget SHALL display current temperature, humidity, wind speed, and weather condition (sunny, cloudy, rainy) for the farm location
2. THE Weather_Widget SHALL display a 5-day forecast with daily high/low temperatures and weather conditions
3. THE Backend_API SHALL provide a weather endpoint returning mock current conditions and a 5-day forecast
4. THE Mock_Data_Service SHALL generate weather data consistent with a tropical agricultural region (Singapore)

### Requirement 5: Crop Health Overview Widget

**User Story:** As a farm operator, I want to see crop health status across different farm zones, so that I can prioritize attention to zones that need intervention.

#### Acceptance Criteria

1. THE Crop_Health_Widget SHALL display a list of farm zones with health status indicators (healthy, needs attention, critical)
2. THE Crop_Health_Widget SHALL show crop type, growth stage, and last inspection date for each zone
3. THE Backend_API SHALL provide a crop health endpoint returning zone-level crop status data
4. THE Mock_Data_Service SHALL generate crop health data for at least 6 farm zones with varied health statuses and crop types

### Requirement 6: NVIDIA Isaac Sim Connection Panel

**User Story:** As a farm operator using robotic automation, I want a dedicated panel to configure and monitor the connection to NVIDIA Isaac Sim, so that I can integrate robotics simulations with my farm dashboard.

#### Acceptance Criteria

1. THE Isaac_Sim_Panel SHALL display a connection configuration form with fields for Isaac Sim server host, port, and streaming endpoint URL
2. THE Isaac_Sim_Panel SHALL display the current connection status (disconnected, connecting, connected, error) with a color-coded status indicator
3. WHEN a user submits connection settings, THE Isaac_Sim_Panel SHALL validate that the host and port fields are non-empty and the port is a valid number between 1 and 65535
4. IF the connection to Isaac Sim fails, THEN THE Isaac_Sim_Panel SHALL display the error message and provide a reconnect option
5. THE Isaac_Sim_Panel SHALL persist connection settings in browser local storage so they survive page reloads

### Requirement 7: Isaac Sim Live Viewport Embed Area

**User Story:** As a farm operator, I want an embedded viewport area where NVIDIA Isaac Sim's WebRTC or streaming output can be displayed, so that I can view live robotics simulations directly within the dashboard.

#### Acceptance Criteria

1. THE Isaac_Sim_Panel SHALL include a viewport area sized at a 16:9 aspect ratio for embedding Isaac Sim streaming output
2. WHILE the Isaac Sim connection status is "disconnected", THE viewport area SHALL display a placeholder message instructing the user to configure and connect to Isaac Sim
3. WHILE the Isaac Sim connection status is "connected", THE viewport area SHALL render an iframe or WebRTC video element pointing to the configured streaming endpoint
4. THE viewport area SHALL include controls for fullscreen toggle and stream quality selection (low, medium, high)

### Requirement 8: Robot Fleet Status Widget

**User Story:** As a farm operator, I want to see the status of agricultural robots operating on the farm, so that I can monitor their activity and identify robots that need attention.

#### Acceptance Criteria

1. THE Robot_Fleet_Widget SHALL display a list of agricultural robots with name, type (drone, ground rover, harvester), current status (active, idle, charging, maintenance), and assigned zone
2. THE Robot_Fleet_Widget SHALL show a summary count of robots by status at the top of the widget
3. THE Backend_API SHALL provide a robot fleet endpoint returning mock robot status data
4. THE Mock_Data_Service SHALL generate data for at least 6 robots with varied types and statuses
5. WHEN a robot status is "maintenance", THE Robot_Fleet_Widget SHALL highlight that robot row with a warning indicator

### Requirement 9: Dashboard Layout with Grid Arrangement

**User Story:** As a farm operator, I want the dashboard overview page to display multiple widgets in a structured grid layout, so that I can see key information at a glance without navigating between pages.

#### Acceptance Criteria

1. THE Dashboard overview page SHALL arrange widgets in a responsive grid: metric cards row, followed by a two-column layout for charts and secondary widgets
2. WHILE the viewport width is below 768px, THE Dashboard SHALL stack all widgets in a single column
3. THE Dashboard sidebar navigation SHALL include entries for all new sections: Weather, Crop Health, Isaac Sim, and Robot Fleet
4. WHEN the Dashboard overview page loads, THE Dashboard SHALL render the metrics overview, a sensor trend chart, recent alerts summary, and weather widget without requiring additional navigation

### Requirement 10: Isaac Sim Simulation Scenarios List

**User Story:** As a farm operator, I want to browse and launch predefined Isaac Sim simulation scenarios (e.g., robot navigation, crop inspection drone flight), so that I can test and visualize robotic operations for my farm.

#### Acceptance Criteria

1. THE Isaac_Sim_Panel SHALL display a list of predefined simulation scenarios with name, description, robot type, and estimated duration
2. THE Mock_Data_Service SHALL provide at least 4 simulation scenarios relevant to agricultural robotics (crop inspection drone, autonomous harvester path, pest patrol rover, irrigation monitoring drone)
3. WHEN a user selects a scenario, THE Isaac_Sim_Panel SHALL display the scenario details and a "Launch in Isaac Sim" button
4. WHEN the "Launch in Isaac Sim" button is clicked and the connection status is "disconnected", THE Isaac_Sim_Panel SHALL display a message prompting the user to connect to Isaac Sim first
