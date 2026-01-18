# Multi-stage build for Railway deployment
# Stage 1: Build the frontend
FROM node:18-alpine AS frontend-build

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

# Expose port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
