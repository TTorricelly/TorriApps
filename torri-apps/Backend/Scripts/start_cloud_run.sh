#!/bin/bash
# Startup script for Cloud Run with Cloud SQL

echo "🚀 Starting Torri Apps Backend on Cloud Run..."

# Start Cloud SQL proxy in background if connection name is provided
if [ ! -z "$CLOUD_SQL_CONNECTION_NAME" ]; then
    echo "🔗 Starting Cloud SQL proxy for: $CLOUD_SQL_CONNECTION_NAME"
    cloud_sql_proxy -instances=$CLOUD_SQL_CONNECTION_NAME=tcp:5432 &
    
    # Wait for proxy to start
    echo "⏳ Waiting for Cloud SQL proxy to start..."
    sleep 5
    
    # Update DATABASE_URL to use local proxy if it's using the unix socket format
    if [[ $DATABASE_URL == *"host=/cloudsql/"* ]]; then
        echo "🔄 Converting DATABASE_URL to use local proxy..."
        # Extract user, password, and database from the connection string
        DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
        DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
        DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*@[^\/]*\/\([^?]*\).*/\1/p')
        
        # Construct new DATABASE_URL using localhost
        export DATABASE_URL="postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME"
        echo "🔗 Updated DATABASE_URL for local proxy connection"
    fi
else
    echo "⚠️  No CLOUD_SQL_CONNECTION_NAME provided, using direct connection"
fi

# Run database migrations
echo "🔄 Running database migrations..."
alembic upgrade head || echo "⚠️  Migration failed or no migrations to run"

# Start the application
echo "🌟 Starting FastAPI application..."
exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080} --workers 1 --timeout-keep-alive 120