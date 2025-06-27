#!/bin/bash
# Fresh database setup for Cloud SQL (recommended approach)

INSTANCE_NAME="torri-apps-db"
PROJECT_ID="linen-nebula-463915-q7"

echo "🔄 Setting up fresh database on Cloud SQL..."

# Wait for instance to be ready
echo "⏳ Waiting for Cloud SQL instance to be ready..."
while [ "$(gcloud sql instances describe $INSTANCE_NAME --format='value(state)' 2>/dev/null)" != "RUNNABLE" ]; do
  echo "Still waiting... ($(date))"
  sleep 30
done

echo "✅ Cloud SQL instance is ready!"

# Connect and setup database
echo "🔧 Setting up database schemas and users..."
gcloud sql connect $INSTANCE_NAME --user=postgres --quiet << 'EOF'
-- Create development and production schemas
CREATE SCHEMA IF NOT EXISTS dev;
CREATE SCHEMA IF NOT EXISTS prod;

-- Create database user for the application
CREATE USER torri_app WITH PASSWORD 'SecurePassword123!';

-- Grant necessary permissions
GRANT CONNECT ON DATABASE postgres TO torri_app;
GRANT USAGE ON SCHEMA dev TO torri_app;
GRANT USAGE ON SCHEMA prod TO torri_app;
GRANT CREATE ON SCHEMA dev TO torri_app;
GRANT CREATE ON SCHEMA prod TO torri_app;

-- Grant permissions on all tables (existing and future)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA dev TO torri_app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA prod TO torri_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA dev TO torri_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA prod TO torri_app;

-- Grant permissions on future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA dev GRANT ALL ON TABLES TO torri_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA prod GRANT ALL ON TABLES TO torri_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA dev GRANT ALL ON SEQUENCES TO torri_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA prod GRANT ALL ON SEQUENCES TO torri_app;

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Set default search path for the user
ALTER USER torri_app SET search_path TO dev, public;

\q
EOF

echo "✅ Database setup completed!"
echo "🔗 Connection details:"
echo "  Host: $(gcloud sql instances describe $INSTANCE_NAME --format='value(ipAddresses[0].ipAddress)')"
echo "  Database: postgres"
echo "  User: torri_app"
echo "  Schemas: dev, prod"