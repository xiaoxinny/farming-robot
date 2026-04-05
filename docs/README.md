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
- **boto3** — AWS SDK (S3 presigned URLs)
- **python-jose** — OIDC JWT validation
- **httpx** — HTTP client for Cognito OIDC token exchange
- **psycopg2** — PostgreSQL driver
- **uvicorn** — ASGI server

### Infrastructure

- **Amazon Cognito** — user authentication via OIDC authorization code flow with Hosted UI, OAuth, MFA (with optional Google OAuth)
- **PostgreSQL** — farm data and sensor readings (managed by Coolify)
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
│   │   │   │   ├── auth/              # Login, CallbackPage, AuthProvider, ProtectedRoute
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
DATABASE_URL=postgresql://postgres:password@localhost:5432/agritech
COGNITO_USER_POOL_ID=ap-southeast-1_XXXXXXXXX
COGNITO_CLIENT_ID=your-cognito-client-id
COGNITO_DOMAIN=your-app.auth.ap-southeast-1.amazoncognito.com
COGNITO_REDIRECT_URI=http://localhost:5173/auth/callback
AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
FRONTEND_URL=http://localhost:5173
DEBUG=true
```

The frontend uses env vars in a `.env` file at `packages/frontend/`:

```env
VITE_API_URL=http://localhost:8000
VITE_COGNITO_DOMAIN=your-app.auth.ap-southeast-1.amazoncognito.com
VITE_COGNITO_CLIENT_ID=your-cognito-client-id
VITE_COGNITO_REDIRECT_URI=http://localhost:5173/auth/callback
```

## Architecture Overview

### Routing (Frontend)

| Path                         | Component          | Auth Required |
| ---------------------------- | ------------------ | ------------- |
| `/`                          | LandingPage        | No            |
| `/login`                     | LoginPage          | No            |
| `/auth/callback`             | CallbackPage       | No            |
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
| POST   | `/api/auth/callback`        | Exchange authorization code for tokens | No   |
| POST   | `/api/auth/logout`          | Clear auth cookies, return Cognito logout URL | No   |
| GET    | `/api/auth/me`              | Current user profile                 | Yes  |
| POST   | `/api/auth/token/refresh`   | Refresh access token via cookie      | No   |
| GET    | `/api/farms/overview`       | Farm overview with aggregated metrics| Yes  |
| GET    | `/api/farms/sensors`        | Latest sensor readings               | Yes  |
| GET    | `/api/farms/alerts`         | Active farm alerts                   | Yes  |
| GET    | `/api/simulations`          | List available simulations           | Yes  |
| GET    | `/api/simulations/{id}`     | Simulation detail with signed S3 URL | Yes  |
| GET    | `/api/health`               | Health check                         | No   |

### Authentication Flow

1. User clicks "Sign in" → frontend generates PKCE params (code_verifier, code_challenge) and a random state, stores them in sessionStorage, and redirects to the Cognito Hosted UI
2. User authenticates (password, MFA, Google) on the Cognito Hosted UI
3. Cognito redirects back to `/auth/callback` with an authorization code and state
4. Frontend validates state, sends code + code_verifier to `POST /api/auth/callback`
5. Backend exchanges the code at Cognito's `/oauth2/token` endpoint for ID, access, and refresh tokens
6. Backend validates the ID token via JWKS, sets httpOnly cookies, and returns the user profile
7. Session expiry → 401 response triggers a single token refresh attempt → if refresh fails, redirect to `/login`

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
- AWS service setup (Cognito, S3, IAM) with both Console and CLI steps
- Coolify PostgreSQL database and Docker Compose deployment
- Environment variable reference
- Troubleshooting
