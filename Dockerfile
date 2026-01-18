# Multi-stage build for Railway deployment
# Stage 1: Build the frontend
FROM node:20-slim AS frontend-builder

WORKDIR /app/frontend

# Copy frontend files
COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# Stage 2: Python backend
FROM python:3.11-slim

WORKDIR /app/backend

# Copy backend files
COPY backend/ ./

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy built frontend from previous stage
COPY --from=frontend-build /app/frontend/dist ../frontend/dist

# For Debian/Ubuntu based images (like python:3.11)
RUN apt-get update && apt-get install -y libpq-dev gcc

# Expose port
EXPOSE 8000

# Run the application
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
