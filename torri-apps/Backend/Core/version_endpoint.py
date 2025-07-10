# Version endpoint for frontend update checking
from fastapi import APIRouter
from fastapi.responses import JSONResponse
import os
import json
from datetime import datetime

router = APIRouter()

def get_app_version():
    """Get application version from various sources"""
    
    # Method 1: Check environment variable
    version = os.getenv('APP_VERSION')
    if version:
        return version
    
    # Method 2: Check package.json (if available)
    try:
        # Try frontend package.json first
        package_path = os.path.join(os.path.dirname(__file__), '../../Web-admin/package.json')
        if os.path.exists(package_path):
            with open(package_path, 'r') as f:
                package_data = json.load(f)
                return package_data.get('version', '1.0.0')
    except:
        pass
    
    # Method 3: Check Git commit hash
    try:
        git_hash = os.getenv('GIT_COMMIT_HASH', '')
        if git_hash:
            return git_hash[:8]  # Short hash
    except:
        pass
    
    # Method 4: Use deployment timestamp
    deploy_time = os.getenv('DEPLOY_TIMESTAMP')
    if deploy_time:
        return f"build-{deploy_time}"
    
    # Fallback: Use current timestamp
    return f"build-{int(datetime.now().timestamp())}"

@router.get("/version")
async def get_version():
    """Return current application version"""
    
    version = get_app_version()
    build_time = os.getenv('BUILD_TIME', datetime.now().isoformat())
    
    return JSONResponse(
        content={
            "version": version,
            "build_time": build_time,
            "timestamp": datetime.now().isoformat()
        },
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }
    )

@router.get("/health-with-version")
async def health_check():
    """Health check endpoint with version info"""
    return {"status": "healthy", "version": get_app_version()}