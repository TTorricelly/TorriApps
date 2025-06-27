#!/bin/bash
# Deploy to Cloud Run with Cloud SQL

PROJECT_ID=$(gcloud config get-value project)
SERVICE_NAME="torri-apps-backend"
REGION="us-central1"
CLOUD_SQL_INSTANCE="torri-apps-db"

echo "🚀 Deploying to Cloud Run..."
echo "📍 Project: $PROJECT_ID"
echo "🌍 Region: $REGION"
echo "🔗 Service: $SERVICE_NAME"

# Build and deploy
gcloud run deploy $SERVICE_NAME \
    --source . \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --memory 512Mi \
    --cpu 1 \
    --timeout 300 \
    --max-instances 10 \
    --set-cloudsql-instances $PROJECT_ID:$REGION:$CLOUD_SQL_INSTANCE \
    --set-env-vars "CLOUD_SQL_CONNECTION_NAME=$PROJECT_ID:$REGION:$CLOUD_SQL_INSTANCE" \
    --set-env-vars "DEFAULT_SCHEMA_NAME=prod" \
    --set-env-vars "USE_CLOUD_STORAGE=true" \
    --set-env-vars "DEBUG=false"

echo "✅ Deployment completed!"
echo "🔗 Service URL:"
gcloud run services describe $SERVICE_NAME --region $REGION --format 'value(status.url)'