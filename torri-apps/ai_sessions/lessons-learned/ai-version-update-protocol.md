# AI Version Update Protocol

## Overview
This document provides a step-by-step protocol for AI agents to automatically update application versions in the Torri Apps project. The agent receives a simple request like "increase the version" and performs all necessary steps.

## Input Commands

The AI agent should respond to these types of requests:
- "increase the version"
- "bump version to X.Y.Z"
- "update version patch/minor/major"
- "deploy new version"

## Step-by-Step Protocol

### Step 1: Read Current Version
```bash
# Read current version from Web-admin package.json (source of truth)
CURRENT_VERSION=$(node -p "require('./Web-admin/package.json').version")
echo "Web-admin current version: $CURRENT_VERSION"

# Read App-client version for comparison
APP_CLIENT_VERSION=$(node -p "require('./App-client/package.json').version")
echo "App-client current version: $APP_CLIENT_VERSION"
```

**Primary source**: `/Users/thiagotorricelly/Projects/TorriApps/torri-apps/Web-admin/package.json`
**Secondary source**: `/Users/thiagotorricelly/Projects/TorriApps/torri-apps/App-client/package.json`
**Look for**: `"version": "X.Y.Z"`

### Step 2: Determine New Version
Based on the request type:

**For "increase version" or "patch":**
```bash
# Update Web-admin version (primary)
cd Web-admin/
NEW_VERSION=$(npm version patch --no-git-tag-version)
echo "Web-admin new version: $NEW_VERSION"

# Update App-client version to match
cd ../App-client/
npm version $NEW_VERSION --no-git-tag-version
echo "App-client updated to: $NEW_VERSION"
cd ..
```

**For "minor version":**
```bash
cd Web-admin/
NEW_VERSION=$(npm version minor --no-git-tag-version)
echo "New version: $NEW_VERSION"
```

**For "major version":**
```bash
cd Web-admin/
NEW_VERSION=$(npm version major --no-git-tag-version)
echo "New version: $NEW_VERSION"
```

**For specific version (e.g., "bump to 1.2.3"):**
```bash
cd Web-admin/
NEW_VERSION=$(npm version 1.2.3 --no-git-tag-version)
echo "New version: $NEW_VERSION"
```

### Step 3: Update Environment Files

**Update .env.local for both frontend apps:**
```bash
# File: Web-admin/.env.local
echo "# Local development environment variables" > Web-admin/.env.local
echo "VITE_APP_VERSION=$NEW_VERSION" >> Web-admin/.env.local

# File: App-client/.env.local
echo "# Local development environment variables" > App-client/.env.local
echo "VITE_APP_VERSION=$NEW_VERSION" >> App-client/.env.local
```

**Update .env.example:**
```bash
# Edit the file to reflect new version pattern
# File: Web-admin/.env.example
# Update the VITE_APP_VERSION example
```

### Step 4: Set Backend Environment Variable
```bash
# Set environment variable for current session
export APP_VERSION=$NEW_VERSION
export BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
export GIT_COMMIT_HASH=$(git rev-parse HEAD)

echo "Backend environment updated:"
echo "  APP_VERSION: $APP_VERSION"
echo "  BUILD_TIME: $BUILD_TIME"
echo "  GIT_COMMIT_HASH: $GIT_COMMIT_HASH"
```

### Step 5: Verify Version Endpoints

**Test backend version endpoint:**
```bash
# Check if backend is running and returns new version
BACKEND_VERSION=$(curl -s http://localhost:8000/api/v1/version | grep -o '"version":"[^"]*"' | cut -d'"' -f4)

if [ "$BACKEND_VERSION" = "$NEW_VERSION" ]; then
    echo "✅ Backend version updated successfully: $BACKEND_VERSION"
else
    echo "⚠️  Backend version mismatch. Expected: $NEW_VERSION, Got: $BACKEND_VERSION"
    echo "Backend may need restart to pick up new environment variables"
fi
```

**Test frontend proxy:**
```bash
# Test version through Vite proxy (if dev server running)
PROXY_VERSION=$(curl -s http://localhost:5173/api/v1/version | grep -o '"version":"[^"]*"' | cut -d'"' -f4)

if [ "$PROXY_VERSION" = "$NEW_VERSION" ]; then
    echo "✅ Frontend proxy working: $PROXY_VERSION"
else
    echo "⚠️  Frontend proxy issue or dev server not running"
fi
```

### Step 6: Update Documentation (Optional)
```bash
# Update version in key documentation files if needed
echo "Version $NEW_VERSION updated on $(date)" >> CHANGELOG.md
```

## Complete Automation Script

Here's a complete script that the AI agent can use:

```bash
#!/bin/bash
# AI Version Update Script
set -e

VERSION_TYPE=${1:-patch}  # patch, minor, major, or specific version
PROJECT_ROOT="/Users/thiagotorricelly/Projects/TorriApps/torri-apps"

echo "🤖 AI Version Update Protocol Starting..."
echo "📁 Project root: $PROJECT_ROOT"

# Step 1: Navigate to project
cd "$PROJECT_ROOT"

# Step 2: Read current version
CURRENT_VERSION=$(node -p "require('./Web-admin/package.json').version")
echo "📦 Current version: $CURRENT_VERSION"

# Step 3: Update version
cd Web-admin/
if [[ "$VERSION_TYPE" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    # Specific version provided
    NEW_VERSION=$(npm version "$VERSION_TYPE" --no-git-tag-version)
else
    # Standard bump type (patch, minor, major)
    NEW_VERSION=$(npm version "$VERSION_TYPE" --no-git-tag-version)
fi
cd ..

echo "🚀 Updated to version: $NEW_VERSION"

# Step 4: Update environment files
echo "📝 Updating environment files..."
echo "# Local development environment variables" > Web-admin/.env.local
echo "VITE_APP_VERSION=$NEW_VERSION" >> Web-admin/.env.local

# Step 5: Set backend environment
export APP_VERSION=$NEW_VERSION
export BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
export GIT_COMMIT_HASH=$(git rev-parse HEAD)

echo "🔧 Backend environment updated:"
echo "  APP_VERSION: $APP_VERSION"
echo "  BUILD_TIME: $BUILD_TIME"

# Step 6: Verify endpoints
echo "🔍 Verifying version endpoints..."

# Test backend
if BACKEND_RESPONSE=$(curl -s http://localhost:8000/api/v1/version 2>/dev/null); then
    BACKEND_VERSION=$(echo "$BACKEND_RESPONSE" | grep -o '"version":"[^"]*"' | cut -d'"' -f4)
    if [ "$BACKEND_VERSION" = "$NEW_VERSION" ]; then
        echo "✅ Backend version verified: $BACKEND_VERSION"
    else
        echo "⚠️  Backend version mismatch. Expected: $NEW_VERSION, Got: $BACKEND_VERSION"
    fi
else
    echo "⚠️  Backend not accessible on http://localhost:8000"
fi

# Test frontend proxy
if PROXY_RESPONSE=$(curl -s http://localhost:5173/api/v1/version 2>/dev/null); then
    PROXY_VERSION=$(echo "$PROXY_RESPONSE" | grep -o '"version":"[^"]*"' | cut -d'"' -f4)
    echo "✅ Frontend proxy working: $PROXY_VERSION"
else
    echo "ℹ️  Frontend dev server not running on http://localhost:5173"
fi

echo "🎉 Version update completed successfully!"
echo "📋 Summary:"
echo "  Previous: $CURRENT_VERSION"
echo "  Current:  $NEW_VERSION"
echo "  Files updated:"
echo "    - Web-admin/package.json"
echo "    - App-client/package.json"
echo "    - Web-admin/.env.local"
echo "    - App-client/.env.local"
echo "    - Backend environment variables"
```

## AI Agent Response Template

When the AI agent receives a version update request, it should:

1. **Acknowledge the request**: "I'll update the application version for you."

2. **Execute the protocol**: Follow steps 1-6 above

3. **Report results**: 
   ```
   ✅ Version Update Complete
   
   📦 Version: 0.0.1 → 0.0.2
   🔧 Backend: Environment variables updated
   📝 Files: package.json and .env.local updated
   🌐 Endpoints: Version API verified
   
   🚀 The new version is now active and will be detected by the auto-update system within 12 hours, or immediately on page refresh.
   ```

4. **Provide next steps** (if applicable):
   - "Restart frontend dev server to see changes immediately"
   - "Deploy to staging/production when ready"
   - "The auto-update system will notify users of the new version"

## Error Handling

If any step fails, the AI should:

1. **Stop execution**: Don't continue with partial updates
2. **Report the specific error**: Include command output
3. **Suggest resolution**: Based on common issues
4. **Offer rollback**: If version was partially updated

### Common Issues:

**Backend not running:**
```bash
# Check if backend process is running
ps aux | grep python | grep main.py || echo "Backend not running"
```

**Frontend dev server not running:**
```bash
# Check if Vite dev server is running
ps aux | grep vite || echo "Vite dev server not running"
```

**Permission issues:**
```bash
# Ensure proper file permissions
chmod +w Web-admin/package.json Web-admin/.env.local
```

## Files the AI Agent Will Modify

1. `Web-admin/package.json` - Version field
2. `Web-admin/.env.local` - VITE_APP_VERSION
3. Environment variables (in memory) - APP_VERSION, BUILD_TIME, GIT_COMMIT_HASH

## Files the AI Agent Will Read

1. `Web-admin/package.json` - Current version
2. `Web-admin/.env.example` - Environment variable patterns
3. API responses from version endpoints

## Success Criteria

The version update is successful when:
- ✅ package.json version is updated
- ✅ .env.local contains new VITE_APP_VERSION
- ✅ Backend environment variable APP_VERSION is set
- ✅ Version API endpoint returns new version
- ✅ No errors during execution

## Integration with Deployment

After version update, the AI can optionally trigger deployment:
- Build frontend with new version: `VITE_APP_VERSION=$NEW_VERSION npm run build`
- Prepare backend environment for deployment
- Create git tag: `git tag $NEW_VERSION`
- Push changes: `git push origin $NEW_VERSION`