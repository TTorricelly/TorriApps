#!/bin/bash
# Import data to Google Cloud SQL

# Cloud SQL connection details
CLOUD_SQL_INSTANCE="torri-apps-db"
CLOUD_SQL_REGION="us-central1"
PROJECT_ID=$(gcloud config get-value project)

echo "🔄 Importing to Google Cloud SQL..."
echo "📍 Instance: $CLOUD_SQL_INSTANCE"
echo "🌍 Project: $PROJECT_ID"

# Check if files exist
EXPORT_DIR="./db_export"
if [ ! -f "$EXPORT_DIR/schema.sql" ]; then
    echo "❌ Export files not found. Run export_supabase_data.sh first!"
    exit 1
fi

# Connect to Cloud SQL and run setup
echo "🔧 Setting up database schemas and users..."
gcloud sql connect $CLOUD_SQL_INSTANCE --user=postgres < scripts/setup_cloud_sql.sql

# Import schema
echo "📋 Importing schema structure..."
gcloud sql import sql $CLOUD_SQL_INSTANCE gs://YOUR_BUCKET_NAME/schema.sql \
    --database=postgres \
    --user=postgres

# Import data
echo "📦 Importing data..."
gcloud sql import sql $CLOUD_SQL_INSTANCE gs://YOUR_BUCKET_NAME/data.sql \
    --database=postgres \
    --user=postgres

echo "✅ Import completed!"
echo "🔗 Get connection details:"
echo "   gcloud sql instances describe $CLOUD_SQL_INSTANCE"