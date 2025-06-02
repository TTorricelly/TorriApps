#!/usr/bin/env python3
"""
Script to test tenant API endpoint
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from main import app

def test_tenant_api():
    client = TestClient(app)
    
    print("Testing /api/v1/tenants/me endpoint...")
    
    # Test without authentication
    response = client.get("/api/v1/tenants/me")
    print(f"Without auth - Status: {response.status_code}")
    print(f"Response: {response.json()}")
    
    # Test with fake token (just to see the error)
    headers = {"Authorization": "Bearer fake_token"}
    response = client.get("/api/v1/tenants/me", headers=headers)
    print(f"\nWith fake token - Status: {response.status_code}")
    print(f"Response: {response.json()}")

if __name__ == "__main__":
    test_tenant_api()