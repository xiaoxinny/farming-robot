"""Gunicorn configuration for production deployment."""

import multiprocessing

# Server socket
bind = "0.0.0.0:8000"

# Worker processes — 2 * CPU cores + 1 is a good baseline
workers = multiprocessing.cpu_count() * 2 + 1

# Use Uvicorn's ASGI worker for FastAPI
worker_class = "uvicorn.workers.UvicornWorker"

# Timeouts
timeout = 120
graceful_timeout = 30
keepalive = 5

# Logging
accesslog = "-"
errorlog = "-"
loglevel = "info"

# Security
limit_request_line = 8190
limit_request_fields = 100
