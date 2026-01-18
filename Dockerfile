# Multi-stage build for Railway deployment

# Stage 1: Build the frontend
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Python backend
FROM python:3.11-slim
WORKDIR /app/backend

# --- FIX 1: Install system dependencies BEFORE pip install ---
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy backend files
COPY backend/ ./

# Install Python dependencies
# Now that gcc and libpq-dev are installed, psycopg2 will build correctly
RUN pip install --no-cache-dir -r requirements.txt

# --- FIX 2: Correct the stage name (added 'er' to frontend-builder) ---
# Also, ensure the destination path exists or matches your app's structure
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Expose port
EXPOSE 8000

# Run the application
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}