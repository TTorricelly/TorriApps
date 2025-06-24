# Google Cloud Deployment Guide

This document covers the deployment setup for TorriApps on Google Cloud Platform, including Cloud Run services and Cloud Storage for file uploads.

## Overview

TorriApps is deployed on Google Cloud using:
- **Cloud Run**: Containerized deployment for both backend (FastAPI) and frontend (React/Vite)
- **Cloud Storage**: Persistent file storage for uploaded images
- **Artifact Registry**: Docker image storage
- **GitHub Actions**: Automated CI/CD pipeline

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │  Cloud Storage  │
│   Cloud Run     │◄──►│   Cloud Run     │◄──►│    Bucket       │
│                 │    │                 │    │                 │
│ React/Vite/Nginx│    │  FastAPI/Python │    │ File Uploads    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │                        │
         └────────────────────────┼────────────────────────┘
                                  │
                     ┌─────────────────┐
                     │   Supabase      │
                     │   PostgreSQL    │
                     └─────────────────┘
```

## Deployed Services

### Backend Service
- **URL**: `https://torri-backend-419996576894.us-central1.run.app`
- **Container**: `us-central1-docker.pkg.dev/linen-nebula-463915-q7/torri-apps/torri-backend`
- **Region**: us-central1
- **Resources**: 1 vCPU, 1GB RAM
- **Scaling**: 0-10 instances

### Frontend Service  
- **URL**: `https://torri-frontend-419996576894.us-central1.run.app`
- **Container**: `us-central1-docker.pkg.dev/linen-nebula-463915-q7/torri-apps/torri-frontend`
- **Region**: us-central1
- **Resources**: 1 vCPU, 512MB RAM
- **Scaling**: 0-5 instances

### Cloud Storage
- **Bucket**: `torri-apps-uploads`
- **Public Access**: Enabled for file serving
- **Organization**: `{tenant_id}/{subdirectory}/{filename}`

## Initial Setup

### 1. Google Cloud Project Setup

```bash
# Set project
gcloud config set project linen-nebula-463915-q7

# Enable required APIs
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable storage.googleapis.com

# Create Artifact Registry repository
gcloud artifacts repositories create torri-apps \
    --repository-format=docker \
    --location=us-central1 \
    --description="TorriApps Docker images"
```

### 2. Cloud Storage Setup

```bash
# Create storage bucket
gsutil mb gs://torri-apps-uploads

# Make bucket publicly readable
gsutil iam ch allUsers:objectViewer gs://torri-apps-uploads

# Set CORS policy (if needed for direct uploads)
echo '[{"origin":["*"],"method":["GET"],"maxAgeSeconds":3600}]' > cors.json
gsutil cors set cors.json gs://torri-apps-uploads
```

### 3. Service Account Setup

Create a service account for GitHub Actions:

```bash
# Create service account
gcloud iam service-accounts create github-actions \
    --description="Service account for GitHub Actions" \
    --display-name="GitHub Actions"

# Grant required permissions
gcloud projects add-iam-policy-binding linen-nebula-463915-q7 \
    --member="serviceAccount:github-actions@linen-nebula-463915-q7.iam.gserviceaccount.com" \
    --role="roles/cloudbuild.builds.builder"

gcloud projects add-iam-policy-binding linen-nebula-463915-q7 \
    --member="serviceAccount:github-actions@linen-nebula-463915-q7.iam.gserviceaccount.com" \
    --role="roles/run.admin"

gcloud projects add-iam-policy-binding linen-nebula-463915-q7 \
    --member="serviceAccount:github-actions@linen-nebula-463915-q7.iam.gserviceaccount.com" \
    --role="roles/storage.admin"

gcloud projects add-iam-policy-binding linen-nebula-463915-q7 \
    --member="serviceAccount:github-actions@linen-nebula-463915-q7.iam.gserviceaccount.com" \
    --role="roles/artifactregistry.admin"

# Generate key file
gcloud iam service-accounts keys create github-actions-key.json \
    --iam-account=github-actions@linen-nebula-463915-q7.iam.gserviceaccount.com
```

### 4. GitHub Secrets

Add these secrets to your GitHub repository:

- `GCP_PROJECT_ID`: `linen-nebula-463915-q7`
- `GCP_SA_KEY`: Contents of `github-actions-key.json`
- `DATABASE_URL`: Your Supabase PostgreSQL connection string

## File Upload System

### Local Development
- Files stored in `torri-apps/Backend/public/uploads/`
- Served by FastAPI StaticFiles at `/uploads` endpoint
- URLs: `http://localhost:8000/uploads/{tenant_id}/icons/{filename}`

### Production
- Files stored in Google Cloud Storage bucket `torri-apps-uploads`
- Direct serving from Cloud Storage
- URLs: `https://storage.googleapis.com/torri-apps-uploads/{tenant_id}/icons/{filename}`

### Environment Configuration

The system automatically switches between local and cloud storage based on the `USE_CLOUD_STORAGE` environment variable:

- **Local**: `USE_CLOUD_STORAGE=false` (default)
- **Production**: `USE_CLOUD_STORAGE=true` (set in Cloud Run deployment)

### File Structure

```
Cloud Storage Bucket: torri-apps-uploads/
├── {tenant-id}/
│   ├── icons/                 # Category icons
│   │   ├── uuid1.png
│   │   └── uuid2.jpg
│   ├── services/              # Service images
│   │   ├── hair-type1/
│   │   └── hair-type2/
│   └── professionals/         # Professional photos
│       └── photos/
└── default/                   # Default tenant
    ├── icons/
    ├── services/
    └── professionals/
```

## Deployment Workflow

### Automatic Deployment
The GitHub Actions workflows automatically deploy on pushes to `main` branch:

1. **Backend CI/CD** (`.github/workflows/backend-ci.yml`):
   - Triggers on changes to `torri-apps/Backend/**`
   - Builds Docker image with Python 3.11
   - Pushes to Artifact Registry
   - Deploys to Cloud Run with environment variables

2. **Frontend CI/CD** (`.github/workflows/frontend-ci.yml`):
   - Triggers on changes to `torri-apps/Web-admin/**`
   - Builds React app with backend URL
   - Creates Docker image with Nginx
   - Deploys to Cloud Run

### Manual Deployment

Backend:
```bash
cd torri-apps/Backend
gcloud run deploy torri-backend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars DATABASE_URL="your-db-url" \
  --set-env-vars USE_CLOUD_STORAGE=true \
  --set-env-vars CORS_ORIGINS="http://localhost:3000;http://localhost:5173;https://torri-frontend-419996576894.us-central1.run.app"
```

Frontend:
```bash
cd torri-apps/Web-admin
gcloud run deploy torri-frontend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

## Environment Variables

### Backend (Cloud Run)
- `DATABASE_URL`: Supabase PostgreSQL connection string
- `USE_CLOUD_STORAGE`: `true` (enables Cloud Storage)
- `CORS_ORIGINS`: Semicolon-separated list of allowed origins
- `PORT`: `8080` (Cloud Run default)

### Frontend (Build-time)
- `VITE_API_BASE_URL`: Backend service URL

## Monitoring & Logs

### Cloud Run Logs
```bash
# Backend logs
gcloud logs tail run.googleapis.com/requests --filter="resource.labels.service_name=torri-backend"

# Frontend logs  
gcloud logs tail run.googleapis.com/requests --filter="resource.labels.service_name=torri-frontend"
```

### Storage Metrics
```bash
# View bucket usage
gsutil du -sh gs://torri-apps-uploads

# List recent uploads
gsutil ls -l gs://torri-apps-uploads/**
```

## Cost Optimization

### Cloud Run
- **Cold starts**: Services scale to 0 when not in use
- **Resource limits**: Backend (1GB RAM), Frontend (512MB RAM)
- **Request concurrency**: Default (80 concurrent requests per instance)

### Cloud Storage
- **Storage class**: Standard (for frequently accessed files)
- **Lifecycle policies**: Consider archive policies for old files
- **CDN**: Consider Cloud CDN for global distribution

## Security

### Access Control
- Service account with minimal required permissions
- Public read access only for uploaded files
- CORS policies restrict direct browser uploads

### Network Security
- Cloud Run services are HTTPS-only
- Environment variables for sensitive configuration
- No hardcoded secrets in code

## Troubleshooting

### Common Issues

1. **File uploads not persisting**
   - Verify `USE_CLOUD_STORAGE=true` in Cloud Run environment
   - Check service account has Storage Admin permissions

2. **CORS errors**
   - Verify frontend URL is in `CORS_ORIGINS` environment variable
   - Use semicolon separator for multiple origins

3. **Container build failures**
   - Ensure Python 3.11+ for union type syntax support
   - Use yarn consistently (not npm) for frontend

4. **Authentication errors**
   - Verify `GCP_SA_KEY` secret is valid JSON
   - Check service account has required IAM roles

### Debug Commands

```bash
# Check Cloud Run service status
gcloud run services describe torri-backend --region=us-central1

# Test storage bucket access
gsutil ls gs://torri-apps-uploads

# View recent deployments
gcloud run revisions list --service=torri-backend --region=us-central1
```

## Next Steps

### Recommended Improvements
1. **CDN**: Add Cloud CDN for global file distribution
2. **Monitoring**: Set up Cloud Monitoring alerts
3. **Backup**: Implement automated database backups
4. **Staging**: Create staging environment for testing
5. **Custom Domain**: Configure custom domain with SSL

### Security Enhancements
1. **VPC**: Move services to private VPC
2. **WAF**: Add Cloud Armor for DDoS protection
3. **Secrets**: Use Secret Manager for sensitive data
4. **Audit**: Enable Cloud Audit Logs

## References

- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Cloud Storage Documentation](https://cloud.google.com/storage/docs)
- [Artifact Registry Documentation](https://cloud.google.com/artifact-registry/docs)
- [GitHub Actions for GCP](https://github.com/google-github-actions)