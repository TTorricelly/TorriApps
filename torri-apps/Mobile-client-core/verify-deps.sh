#!/bin/bash

echo "🔍 Verifying React Native dependencies..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $1${NC}"
    else
        echo -e "${RED}❌ $1${NC}"
        exit 1
    fi
}

# 1. Check Node and npm versions
echo "📦 Checking Node.js and npm versions..."
node --version && npm --version
print_status "Node.js and npm versions"

# 2. Verify package.json dependencies
echo "📋 Checking package.json for conflicts..."
npm ls --depth=0 > /dev/null 2>&1
print_status "Package dependency tree"

# 3. Check for security vulnerabilities
echo "🔒 Running security audit..."
npm audit --audit-level=high
print_status "Security audit"

# 4. Verify TypeScript compilation
echo "📘 Checking TypeScript compilation..."
npx tsc --noEmit
print_status "TypeScript compilation"

# 5. Test Metro bundler
echo "📱 Testing Metro bundler..."
timeout 30 npx react-native start --reset-cache > /dev/null 2>&1 &
METRO_PID=$!
sleep 10
kill $METRO_PID 2>/dev/null
print_status "Metro bundler startup"

# 6. Verify React Native doctor
echo "🩺 Running React Native doctor..."
npx react-native doctor
print_status "React Native doctor"

# 7. Check iOS dependencies
if [ -d "ios" ]; then
    echo "🍎 Checking iOS dependencies..."
    cd ios
    
    # Check Podfile syntax
    pod spec lint --allow-warnings Podfile > /dev/null 2>&1
    print_status "Podfile syntax"
    
    # Check for pod conflicts
    pod outdated | grep -q "newer" && echo -e "${YELLOW}⚠️  Some pods have newer versions available${NC}"
    
    cd ..
fi

# 8. Test JS bundle generation
echo "📦 Testing JS bundle generation..."
npx react-native bundle \
    --platform ios \
    --dev false \
    --entry-file index.js \
    --bundle-output /tmp/rn-test-bundle.js \
    --assets-dest /tmp/rn-test-assets > /dev/null 2>&1
print_status "JS bundle generation"

# Clean up
rm -f /tmp/rn-test-bundle.js
rm -rf /tmp/rn-test-assets

echo -e "${GREEN}🎉 All dependency checks passed!${NC}"
echo "You can now build with confidence in Xcode."