#!/bin/bash

# White-label deployment script
BRAND=$1
PLATFORM=$2

if [ -z "$BRAND" ] || [ -z "$PLATFORM" ]; then
  echo "Usage: ./white-label-deploy.sh <brand-name> <ios|android|both>"
  exit 1
fi

echo "Deploying white-label app for $BRAND on $PLATFORM..."

cd "Mobile-client-configs/Brands/$BRAND"

if [ "$PLATFORM" = "ios" ] || [ "$PLATFORM" = "both" ]; then
  echo "Building and deploying iOS app..."
  fastlane ios deploy
fi

if [ "$PLATFORM" = "android" ] || [ "$PLATFORM" = "both" ]; then
  echo "Building and deploying Android app..."
  fastlane android deploy
fi

echo "White-label deployment completed for $BRAND!"

