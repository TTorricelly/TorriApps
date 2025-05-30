#!/bin/bash

# Build all brand applications
BRANDS=("luxe-salon" "beauty-hub" "glamour-studio" "urban-salon")

for brand in "${BRANDS[@]}"; do
  echo "Building $brand..."
  cd "Mobile-client-configs/Brands/$brand"
  
  # iOS Build
  echo "Building iOS app for $brand"
  fastlane ios build
  
  # Android Build  
  echo "Building Android app for $brand"
  fastlane android build
  
  cd ../../..
done

echo "All brands built successfully!"

