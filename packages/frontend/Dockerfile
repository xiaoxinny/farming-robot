# ── Stage 1: Build the React SPA ──────────────────────────
FROM node:22-alpine AS build

WORKDIR /app

# Copy root workspace config + lockfile and frontend package.json
COPY package.json package-lock.json ./
COPY packages/frontend/package.json packages/frontend/

# Install only the frontend workspace dependencies
RUN npm ci --workspace=packages/frontend --include-workspace-root

# Copy frontend source
COPY packages/frontend/ packages/frontend/

# Build args baked into the static bundle at compile time
ARG VITE_API_URL
ARG VITE_COGNITO_DOMAIN
ARG VITE_COGNITO_CLIENT_ID
ARG VITE_COGNITO_REDIRECT_URI
ENV VITE_API_URL=${VITE_API_URL} \
    VITE_COGNITO_DOMAIN=${VITE_COGNITO_DOMAIN} \
    VITE_COGNITO_CLIENT_ID=${VITE_COGNITO_CLIENT_ID} \
    VITE_COGNITO_REDIRECT_URI=${VITE_COGNITO_REDIRECT_URI}

RUN npm run build --workspace=packages/frontend

# ── Stage 2: Serve with nginx ────────────────────────────
FROM nginx:1.27-alpine AS production

COPY packages/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/packages/frontend/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
