# AgriTech Platform

A full-stack web application for an agri-tech startup based in Singapore. The platform serves as both a public marketing website and an authenticated dashboard for farm monitoring, analytics, and simulation viewing.

## Tech Stack

### Frontend (`packages/frontend/`)

- **React 19** with TypeScript — UI framework
- **Vite** — build tool and dev server
- **React Router v7** — client-side routing
- **TanStack Query v5** — server state management with polling
- **Tailwind CSS v4** — utility-first styling
- **Lucide React** — icon library
- **shadcn/ui conventions** — component patterns (cn utility, CSS variables)

### Backend (`packages/backend/`)

- **Python 3.10+** with **FastAPI** — REST API framework
- **Pydantic v2** / **pydantic-settings** — request/response validation and config
- **boto3** — AWS SDK (Cognito, S3)
- **python-jose** — JWT validation
- **httpx** — HTTP client for JWKS fetching
- **psycopg2** — PostgreSQL driver (for future RDS integration)
- **uvicorn** — ASGI server

### Infrastructure (AWS)

- **Amazon Cognito** — user authentication, OAuth, MFA
- **Amazon RDS (PostgreSQL)** — farm data and sensor readings
- **Amazon S3** — simulation media and static assets

## Monorepo Structure

```
/
├── docs/                              # Project documentation
├── packages/
│   ├── frontend/                      # React SPA
│   │   ├── src/
│   │   │   ├── components/            # Shared UI (NavigationBar, MediaPlaceholder)
│   │   │   ├── features/
│   │   │   │   ├── landing/           # Public landing page sections
│   │   │   │   ├── auth/              # Login, MFA, AuthProvider, ProtectedRoute
│   │   │   │   └── dashboard/         # Dashboard layout and widgets
│   │   │   ├── hooks/                 # Custom React hooks
│   │   │   ├── lib/                   # API client, utilities
│   │   │   └── types/                 # TypeScript type definitions
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   └── package.json
│   └── backend/
│       ├── app/
│       │   ├── api/                   # Route handlers (auth, farms, simulations)
│       │   ├── core/                  # Config, security, dependency injection
│       │   ├── models/                # Pydantic / SQLAlchemy models
│       │   ├── services/              # Business logic layer
│       │   └── main.py                # FastAPI app entry point
│       ├── requirements.txt
│       └── pyproject.toml
├── .husky/                            # Pre-commit hooks (lint + format)
└── package.json                       # Root workspace config
```

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+
- npm 9+

### Install Dependencies

```bash
# Root workspace (installs frontend deps + Husky hooks)
npm install

# Backend Python deps
cd packages/backend
pip install -r requirements.txt
```

### Run the Frontend

```bash
cd packages/frontend
npm run dev
```

The dev server starts at `http://localhost:5173`.

### Run the Backend

```bash
cd packages/backend
uvicorn app.main:app --reload --port 8000
```

The API is available at `http://localhost:8000`. Interactive docs at `/docs` (when `DEBUG=true`).

### Environment Variables

Create a `.env` file in `packages/backend/` with:

```env
SECRET_KEY=your-secret-key
DATABASE_URL=postgresql://user:pass@localhost:5432/agritech
COGNITO_USER_POOL_ID=ap-southeast-1_XXXXXXXXX
COGNITO_CLIENT_ID=your-cognito-client-id
AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
FRONTEND_URL=http://localhost:5173
DEBUG=true
```

The frontend uses a single optional env var in a `.env` file at `packages/frontend/`:

```env
VITE_API_URL=http://localhost:8000
```

## Architecture Overview

### Routing (Frontend)

| Path                         | Component          | Auth Required |
| ---------------------------- | ------------------ | ------------- |
| `/`                          | LandingPage        | No            |
| `/login`                     | LoginPage          | No            |
| `/mfa`                       | MfaChallenge       | No            |
| `/dashboard`                 | DashboardLayout    | Yes           |
| `/dashboard/sensors`         | SensorDataWidget   | Yes           |
| `/dashboard/alerts`          | AlertsWidget       | Yes           |
| `/dashboard/analytics`       | AnalyticsWidget    | Yes           |
| `/dashboard/simulations`     | SimulationList     | Yes           |
| `/dashboard/simulations/:id` | SimulationViewer   | Yes (lazy)    |

Protected routes are wrapped in `ProtectedRoute`, which redirects unauthenticated users to `/login`. The `SimulationViewer` is lazy-loaded via `React.lazy()` with a `Suspense` fallback.

### API Endpoints (Backend)

All endpoints are prefixed with `/api`.

| Method | Path                        | Description                          | Auth |
| ------ | --------------------------- | ------------------------------------ | ---- |
| POST   | `/api/auth/login`           | Email/password login                 | No   |
| POST   | `/api/auth/logout`          | Clear auth cookies                   | No   |
| POST   | `/api/auth/mfa/verify`      | Verify MFA code                      | No   |
| POST   | `/api/auth/token/refresh`   | Refresh access token via cookie      | No   |
| GET    | `/api/farms/overview`       | Farm overview with aggregated metrics| Yes  |
| GET    | `/api/farms/sensors`        | Latest sensor readings               | Yes  |
| GET    | `/api/farms/alerts`         | Active farm alerts                   | Yes  |
| GET    | `/api/simulations`          | List available simulations           | Yes  |
| GET    | `/api/simulations/{id}`     | Simulation detail with signed S3 URL | Yes  |
| GET    | `/api/health`               | Health check                         | No   |

### Authentication Flow

1. User submits credentials → `POST /api/auth/login`
2. If MFA required → frontend transitions to `mfa_pending` state → redirects to `/mfa`
3. User submits MFA code → `POST /api/auth/mfa/verify`
4. On success → httpOnly cookies set, state becomes `authenticated`
5. On 3 consecutive MFA failures → account locked via Cognito `AdminDisableUser`
6. Session expiry → 401 response triggers `session-expired` event → redirect to `/login`

JWT tokens are stored in httpOnly cookies (never in localStorage).

### Data Fetching

Dashboard widgets use TanStack Query with `refetchInterval: 30000` (30s polling). Each widget has its own query key for granular cache invalidation. Failed requests show an `ErrorRetry` component with a retry button.

### Error Handling (Backend)

All errors return structured JSON:

```json
{ "detail": "string or array", "code": "ERROR_CODE" }
```

- **422** — Pydantic validation errors (detail is an array)
- **401** — Authentication failures
- **403** — Account locked
- **404** — Resource not found
- **500** — Unhandled exceptions (logged server-side)

## Available Scripts

### Frontend

```bash
npm run dev        # Start Vite dev server
npm run build      # Type-check + production build
npm run preview    # Preview production build
npm run lint       # Run ESLint
npm run format     # Run Prettier
```

### Backend

```bash
uvicorn app.main:app --reload    # Dev server with hot reload
```

### Testing

```bash
# Frontend tests (Vitest + React Testing Library)
npm run test --workspace=packages/frontend

# Backend tests (pytest + httpx)
cd packages/backend
python -m pytest tests/ -v
```

## Deployment

See [docs/DEPLOYMENT.md](DEPLOYMENT.md) for full deployment instructions covering:
- AWS service setup (Cognito, RDS, S3, IAM) with both Console and CLI steps
- Coolify Docker Compose deployment
- Environment variable reference
- Troubleshooting
