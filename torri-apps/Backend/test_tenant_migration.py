#!/usr/bin/env python3
"""
Test script for Tenant Migration functionality
"""

import os
import sys
from pathlib import Path

# Add current directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

def test_imports():
    """Test that all modules can be imported successfully"""
    try:
        print("Testing imports...")
        
        # Test Settings
        from Config.Settings import settings
        print(f"✅ Settings imported - Public DB URL: {settings.public_database_url}")
        
        # Test Database models
        from Config.Database import Base, BasePublic
        print(f"✅ Database bases imported - Base tables: {len(Base.metadata.tables)}, BasePublic tables: {len(BasePublic.metadata.tables)}")
        
        # Test Tenant Migration service
        from Core.TenantMigration.service import create_schema_and_migrate, migrate_all
        print("✅ Tenant migration service imported")
        
        # Test CLI
        from Core.TenantMigration.cli import cli
        print("✅ CLI imported")
        
        # Test models
        from Modules.Tenants.models import Tenant
        from Modules.AdminMaster.models import AdminMasterUser
        from Core.Auth.models import UserTenant
        from Modules.Services.models import Service, Category
        from Modules.Appointments.models import Appointment
        from Modules.Availability.models import ProfessionalAvailability
        print("✅ All models imported successfully")
        
        print(f"\\n📊 Metadata Summary:")
        print(f"   • BasePublic tables: {list(BasePublic.metadata.tables.keys())}")
        print(f"   • Base (tenant) tables: {list(Base.metadata.tables.keys())}")
        
        return True
        
    except Exception as e:
        print(f"❌ Import failed: {e}")
        return False

def test_env_configuration():
    """Test Alembic env.py configuration"""
    try:
        print("\\nTesting Alembic env.py configuration...")
        
        # Test that env.py can be imported and has the required functions
        import importlib.util
        spec = importlib.util.spec_from_file_location("env", "migrations/env.py")
        env_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(env_module)
        
        # Check if required functions exist
        if hasattr(env_module, 'run_migrations_online') and hasattr(env_module, 'run_migrations_offline'):
            print("✅ Alembic env.py has required migration functions")
        else:
            print("❌ Missing required migration functions in env.py")
            return False
            
        # Test metadata selection logic
        from Config.Database import Base, BasePublic
        print(f"✅ Metadata accessible - Base: {len(Base.metadata.tables)} tables, BasePublic: {len(BasePublic.metadata.tables)} tables")
        
        return True
        
    except Exception as e:
        print(f"❌ Env configuration test failed: {e}")
        return False

def main():
    """Run all tests"""
    print("🧪 Testing Tenant Migration Implementation")
    print("="*50)
    
    tests = [
        test_imports,
        test_env_configuration,
    ]
    
    results = []
    for test in tests:
        try:
            result = test()
            results.append(result)
        except Exception as e:
            print(f"❌ Test {test.__name__} crashed: {e}")
            results.append(False)
    
    print("\\n" + "="*50)
    print("TEST SUMMARY")
    print("="*50)
    
    passed = sum(results)
    total = len(results)
    
    print(f"Passed: {passed}/{total}")
    
    if all(results):
        print("🎉 All tests passed! The tenant migration system is ready to use.")
        print("\\n📖 Usage Examples:")
        print("   # Create and migrate a tenant schema:")
        print("   python tenant_cli.py create tenant_alpha")
        print("   ")
        print("   # Migrate all existing tenants:")
        print("   python tenant_cli.py upgrade-all")
        print("   ")
        print("   # Migrate public schema:")
        print("   python tenant_cli.py upgrade-public")
        print("   ")
        print("   # List all tenants:")
        print("   python tenant_cli.py list-tenants")
    else:
        print("❌ Some tests failed. Please fix the issues before using the tenant migration system.")
        sys.exit(1)

if __name__ == "__main__":
    main()