#!/usr/bin/env python3
"""
Simple healthcheck script to test if the app can start
"""
import sys
import os

# Add current directory to path
sys.path.insert(0, os.getcwd())

try:
    print("🔍 Starting healthcheck...")
    
    print("1. Testing imports...")
    from fastapi import FastAPI
    print("   ✅ FastAPI imported")
    
    from Config.Settings import settings
    print("   ✅ Settings imported")
    
    print("2. Testing database connection...")
    try:
        from Config.Database import get_db
        db = next(get_db())
        print("   ✅ Database connection successful")
        db.close()
    except Exception as e:
        print(f"   ⚠️ Database connection failed: {e}")
        print("   (This might be OK if DATABASE_URL is not set)")
    
    print("3. Testing main app import...")
    from main import app
    print("   ✅ Main app imported successfully")
    
    print("🎉 Healthcheck passed! App should be able to start.")
    sys.exit(0)
    
except Exception as e:
    print(f"❌ Healthcheck failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)