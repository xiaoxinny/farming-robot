# ── Stage 1: Build the React SPA ──────────────────────────
FROM node:22-alpine AS build

WORKDIR /app

# Copy root workspace files first for dependency resolution
COPY package.json package-lock.json* ./
COPY packages/frontend/package.json packages/frontend/

# Install dependencies (workspace-aware)
RUN npm ci --workspace=packages/frontend

# Copy frontend source
COPY packages/frontend/ packages/frontend/

# Build arg for API URL baked into the static bundle
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

RUN npm run build --workspace=packages/frontend

# ── Stage 2: Serve with nginx ────────────────────────────
FROM nginx:1.27-alpine AS production

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config for SPA routing
COPY packages/frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from the build stage
COPY --from=build /app/packages/frontend/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
