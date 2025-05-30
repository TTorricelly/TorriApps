#!/bin/bash

BRAND=$1

if [ -z "$BRAND" ]; then
  echo "Usage: ./deploy-ios.sh <brand-name>"
  exit 1
fi

echo "Deploying iOS app for $BRAND..."
cd "Mobile-client-configs/Brands/$BRAND"
fastlane ios deploy

