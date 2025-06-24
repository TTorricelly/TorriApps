FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY Requirements.txt .
RUN pip install --no-cache-dir -r Requirements.txt

# Copy application code
COPY . .

# Create uploads directory
RUN mkdir -p public/uploads

# Expose port
EXPOSE 8080

# Set environment variables for Cloud Run
ENV PORT=8080
ENV PYTHONPATH=/app

# Add startup timeout settings
ENV UVICORN_TIMEOUT_KEEP_ALIVE=120

# Run the application with extended timeout
CMD exec uvicorn main:app --host 0.0.0.0 --port $PORT --workers 1 --timeout-keep-alive 120