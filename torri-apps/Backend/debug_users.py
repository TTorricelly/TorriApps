#!/usr/bin/env python3
"""
Script to debug user data and tenant associations
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from Config.Database import SessionLocal
from Config.Settings import settings
from Core.Auth.models import UserTenant
from Modules.Tenants.models import Tenant
from sqlalchemy import text

def check_user_tenant_associations():
    db = SessionLocal()
    try:
        print(f"Using schema: {settings.default_schema_name}")
        # PostgreSQL: Set search_path to use specific schema
        db.execute(text(f"SET search_path TO {settings.default_schema_name}, public"))
        
        # First check tenants
        tenants = db.query(Tenant).all()
        print(f"Available tenants: {len(tenants)}")
        tenant_lookup = {tenant.id: tenant.name for tenant in tenants}
        
        for tenant in tenants:
            print(f"  - {tenant.id}: {tenant.name}")
        
        print("\n" + "="*50)
        print("Checking user-tenant associations...")
        
        # Now check each tenant schema for users
        for tenant in tenants:
            try:
                schema_name = tenant.db_schema_name
                print(f"\nChecking schema: {schema_name}")
                db.execute(text(f"USE `{schema_name}`;"))
                
                users = db.query(UserTenant).all()
                print(f"Found {len(users)} users in {schema_name}:")
                
                for user in users:
                    print(f"  - Email: {user.email}")
                    print(f"    ID: {user.id}")
                    print(f"    Tenant ID: {user.tenant_id}")
                    print(f"    Role: {user.role}")
                    print(f"    Active: {user.is_active}")
                    tenant_name = tenant_lookup.get(user.tenant_id, "Unknown")
                    print(f"    Tenant Name: {tenant_name}")
                    print()
                    
            except Exception as e:
                print(f"Error accessing schema {schema_name}: {e}")
                
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    check_user_tenant_associations()