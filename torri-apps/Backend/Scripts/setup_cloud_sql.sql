-- Setup script for Google Cloud SQL
-- Run this after creating the Cloud SQL instance

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