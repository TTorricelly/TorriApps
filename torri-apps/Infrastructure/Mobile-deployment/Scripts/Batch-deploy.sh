#!/bin/bash

# Deploy all brands to stores
BRANDS=("luxe-salon" "beauty-hub" "glamour-studio" "urban-salon")
PLATFORM=$1

if [ -z "$PLATFORM" ]; then
  echo "Usage: ./batch-deploy.sh <ios|android|both>"
  exit 1
fi

for brand in "${BRANDS[@]}"; do
  echo "Deploying $brand for $PLATFORM..."
  
  if [ "$PLATFORM" = "ios" ] || [ "$PLATFORM" = "both" ]; then
    ./Deploy-ios.sh $brand
  fi
  
  if [ "$PLATFORM" = "android" ] || [ "$PLATFORM" = "both" ]; then
    ./Deploy-android.sh $brand
  fi
done

echo "Batch deployment completed!"

