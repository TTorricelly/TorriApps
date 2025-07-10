# Vite Environment Variable Guide for Versioning

## 🎯 Environment Variable Configuration

### Development (.env.local)
```bash
# For local development
VITE_APP_VERSION=1.0.0-dev
```

### Build Pipeline Integration
```bash
# In your deployment pipeline:

# Step 1: Get version from package.json
VERSION=$(node -p "require('./package.json').version")

# Step 2: Build with version
VITE_APP_VERSION=$VERSION npm run build

# Step 3: Set backend environment variables
export APP_VERSION=$VERSION
export BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
export GIT_COMMIT_HASH=$(git rev-parse HEAD)
```

## 🏗️ Pipeline Integration Examples

### Simple Script Addition
```bash
#!/bin/bash
# Add to your existing deployment script

cd Web-admin/

# Update version (if needed)
npm version patch --no-git-tag-version

# Get current version
VERSION=$(node -p "require('./package.json').version")

# Build frontend with version
VITE_APP_VERSION=$VERSION npm run build

# Set backend environment variables for deployment
export APP_VERSION=$VERSION
export BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
export GIT_COMMIT_HASH=$(git rev-parse HEAD)

# Continue with your existing deployment steps...
```

### Docker Build Integration
```dockerfile
# Dockerfile.frontend
FROM node:18-alpine as builder

# Build arguments
ARG VITE_APP_VERSION
ARG BUILD_TIME
ARG GIT_COMMIT_HASH

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . ./
RUN VITE_APP_VERSION=${VITE_APP_VERSION} npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
```

### GitHub Actions Example
```yaml
- name: Build frontend with version
  run: |
    cd Web-admin/
    VERSION=$(node -p "require('./package.json').version")
    VITE_APP_VERSION=$VERSION npm run build
```

### GitLab CI Example
```yaml
build_frontend:
  script:
    - cd Web-admin/
    - export VERSION=$(node -p "require('./package.json').version")
    - VITE_APP_VERSION=$VERSION npm run build
```

## 🔧 Version Sources

### Option 1: Package.json Version (Recommended)
```json
{
  "name": "torri-apps-admin",
  "version": "1.2.3"
}
```

**Pipeline usage:**
```bash
VERSION=$(node -p "require('./Web-admin/package.json').version")
VITE_APP_VERSION=$VERSION npm run build
```

### Option 2: Git Tags
```bash
# Create git tag
git tag v1.2.3
git push origin v1.2.3

# Use in pipeline
VERSION=$(git describe --tags --always)
VITE_APP_VERSION=$VERSION npm run build
```

### Option 3: Environment-Based
```bash
# Set in CI/CD environment
export VERSION="1.2.3"
VITE_APP_VERSION=$VERSION npm run build
```

## 🚀 Complete Deployment Flow

```bash
#!/bin/bash
set -e

echo "🚀 Starting deployment..."

# 1. Navigate to frontend directory
cd Web-admin/

# 2. Update version (choose one method)
# Method A: Auto-increment
npm version patch --no-git-tag-version

# Method B: Set specific version
# npm version 1.2.3 --no-git-tag-version

# 3. Get version for build
VERSION=$(node -p "require('./package.json').version")
echo "📦 Building version: $VERSION"

# 4. Build frontend with version
VITE_APP_VERSION=$VERSION npm run build

# 5. Prepare backend environment variables
export APP_VERSION=$VERSION
export BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
export GIT_COMMIT_HASH=$(git rev-parse HEAD)

echo "✅ Frontend built successfully with version $VERSION"

# 6. Continue with your existing deployment steps
cd ..
# ... your deployment commands ...

echo "🎉 Deployment completed!"
```

## 🧪 Testing Version Detection

### Local Testing
```bash
# 1. Set version in .env.local
echo "VITE_APP_VERSION=1.2.3-test" > Web-admin/.env.local

# 2. Start development server
npm run dev

# 3. Check version in browser console
# The VersionChecker should log: "App version: 1.2.3-test"
```

### Production Testing
```bash
# Test version endpoint
curl https://your-domain.com/api/v1/version

# Expected response:
{
  "version": "1.2.3",
  "build_time": "2025-01-10T15:30:00Z",
  "timestamp": "2025-01-10T15:35:22.123Z"
}
```

## 📋 Quick Checklist

- [ ] Add `VITE_APP_VERSION=1.0.0` to `.env.example`
- [ ] Create `.env.local` for development with version
- [ ] Update your build script to include `VITE_APP_VERSION=$VERSION`
- [ ] Set `APP_VERSION` environment variable for backend
- [ ] Test version detection in browser console
- [ ] Verify `/api/v1/version` endpoint returns correct version
- [ ] Test auto-update notification system

## 🔍 Troubleshooting

### Issue: "process is not defined"
**Solution:** Use `import.meta.env.VITE_APP_VERSION` instead of `process.env.REACT_APP_VERSION`

### Issue: Version not detected
**Solution:** Ensure environment variable starts with `VITE_` prefix and is set during build

### Issue: Version endpoint returns wrong version
**Solution:** Check that `APP_VERSION` environment variable is set for backend deployment

## 🎯 Minimal Integration

If you want to add versioning with minimal changes to your existing pipeline:

```bash
# Add these 3 lines before your existing build command:
cd Web-admin/
VERSION=$(node -p "require('./package.json').version")
export VITE_APP_VERSION=$VERSION

# Your existing build command (now with version):
npm run build

# Add this line before your backend deployment:
export APP_VERSION=$VERSION
```

That's it! The version system will now work with your existing automation.