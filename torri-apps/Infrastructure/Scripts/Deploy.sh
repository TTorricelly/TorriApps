#!/bin/bash

# Main deployment script
echo "Starting deployment..."

# Build backend
echo "Building backend..."
cd Backend
pip install -r Requirements.txt
python -m pytest Tests/

# Build web admin
echo "Building web admin..."
cd ../Web-admin
npm install
npm run build

# Deploy to production
echo "Deploying to production..."
# Add your deployment commands here

echo "Deployment completed successfully!"

