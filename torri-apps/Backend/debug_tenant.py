#!/usr/bin/env python3
"""
Script to debug tenant data in the database
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from Config.Database import SessionLocal
from Config.Settings import settings
from Modules.Tenants.models import Tenant
from sqlalchemy import text

def check_tenant_data():
    db = SessionLocal()
    try:
        # For PostgreSQL, we can specify schema in the connection or use search_path
        print(f"Using schema: {settings.default_schema_name}")
        # PostgreSQL: Set search_path to use specific schema
        db.execute(text(f"SET search_path TO {settings.default_schema_name}, public"))
        
        print("Checking for tenant data...")
        
        # List all tenants
        tenants = db.query(Tenant).all()
        print(f"Found {len(tenants)} tenants:")
        
        for tenant in tenants:
            print(f"  - ID: {tenant.id}")
            print(f"    Name: {tenant.name}")
            print(f"    Slug: {tenant.slug}")
            print(f"    Schema: {tenant.db_schema_name}")
            print()
            
        if not tenants:
            print("No tenants found. Creating a sample tenant...")
            sample_tenant = Tenant(
                name="Salão Exemplo TorriApps",
                slug="salao-exemplo",
                db_schema_name="tenant_exemplo",
                logo_url=None,
                primary_color="#00BFFF",
                block_size_minutes=30
            )
            db.add(sample_tenant)
            db.commit()
            print(f"Created sample tenant with ID: {sample_tenant.id}")
            
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    check_tenant_data()