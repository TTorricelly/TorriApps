#!/bin/bash
# Startup script for Cloud Run with Cloud SQL proxy

# Start Cloud SQL proxy in background
if [ ! -z "$CLOUD_SQL_CONNECTION_NAME" ]; then
    echo "🔗 Starting Cloud SQL proxy for: $CLOUD_SQL_CONNECTION_NAME"
    cloud_sql_proxy -instances=$CLOUD_SQL_CONNECTION_NAME=tcp:5432 &
    
    # Wait for proxy to start
    sleep 5
fi

# Run database migrations
echo "🔄 Running database migrations..."
alembic upgrade head

# Start the application
echo "🚀 Starting Torri Apps Backend..."
exec uvicorn main:app --host 0.0.0.0 --port $PORT --workers 1 --timeout-keep-alive 120