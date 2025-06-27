FROM python:3.11-slim

WORKDIR /app

# Install system dependencies including Cloud SQL proxy
RUN apt-get update && apt-get install -y \
    gcc \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Install Cloud SQL Auth Proxy
RUN wget https://dl.google.com/cloudsql/cloud_sql_proxy.linux.amd64 -O cloud_sql_proxy \
    && chmod +x cloud_sql_proxy \
    && mv cloud_sql_proxy /usr/local/bin/

# Copy requirements first for better caching
COPY Requirements.txt .
RUN pip install --no-cache-dir -r Requirements.txt

# Copy application code
COPY . .

# Create uploads directory
RUN mkdir -p public/uploads

# Create startup script
COPY Scripts/start_cloud_run.sh /start_cloud_run.sh
RUN chmod +x /start_cloud_run.sh

# Expose port
EXPOSE 8080

# Set environment variables for Cloud Run
ENV PORT=8080
ENV PYTHONPATH=/app
ENV UVICORN_TIMEOUT_KEEP_ALIVE=120

# Run the application with Cloud SQL proxy
CMD ["/start_cloud_run.sh"]