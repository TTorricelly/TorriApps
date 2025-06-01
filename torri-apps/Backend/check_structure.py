#!/usr/bin/env python3
"""
Structure check for Tenant Migration implementation
"""

import os
from pathlib import Path

def check_files_exist():
    """Check that all required files exist"""
    required_files = [
        "Core/TenantMigration/__init__.py",
        "Core/TenantMigration/service.py", 
        "Core/TenantMigration/cli.py",
        "tenant_cli.py",
        "Config/Database.py",
        "migrations/env.py",
        "alembic.ini",
        "Requirements.txt"
    ]
    
    print("📁 Checking file structure...")
    missing_files = []
    
    for file_path in required_files:
        if os.path.exists(file_path):
            print(f"✅ {file_path}")
        else:
            print(f"❌ {file_path} - MISSING")
            missing_files.append(file_path)
    
    return len(missing_files) == 0

def check_dependencies():
    """Check Requirements.txt has necessary dependencies"""
    print("\\n📦 Checking dependencies...")
    
    try:
        with open("Requirements.txt", "r") as f:
            requirements = f.read()
        
        required_deps = ["alembic", "sqlalchemy", "click", "mysql-connector-python"]
        missing_deps = []
        
        for dep in required_deps:
            if dep in requirements:
                print(f"✅ {dep}")
            else:
                print(f"❌ {dep} - MISSING")
                missing_deps.append(dep)
        
        return len(missing_deps) == 0
        
    except FileNotFoundError:
        print("❌ Requirements.txt not found")
        return False

def check_model_structure():
    """Check that model files exist and have correct structure"""
    print("\\n🏗️  Checking model structure...")
    
    model_files = [
        "Modules/Tenants/models.py",
        "Modules/AdminMaster/models.py", 
        "Core/Auth/models.py",
        "Modules/Services/models.py",
        "Modules/Appointments/models.py",
        "Modules/Availability/models.py"
    ]
    
    missing_models = []
    
    for model_file in model_files:
        if os.path.exists(model_file):
            print(f"✅ {model_file}")
        else:
            print(f"❌ {model_file} - MISSING")
            missing_models.append(model_file)
    
    return len(missing_models) == 0

def check_import_syntax():
    """Basic syntax check of key files"""
    print("\\n🔍 Checking Python syntax...")
    
    key_files = [
        "Core/TenantMigration/service.py",
        "Core/TenantMigration/cli.py", 
        "tenant_cli.py"
    ]
    
    syntax_errors = []
    
    for file_path in key_files:
        try:
            with open(file_path, "r") as f:
                code = f.read()
            
            # Basic syntax check
            compile(code, file_path, "exec")
            print(f"✅ {file_path} - Syntax OK")
            
        except SyntaxError as e:
            print(f"❌ {file_path} - Syntax Error: {e}")
            syntax_errors.append(file_path)
        except FileNotFoundError:
            print(f"❌ {file_path} - File not found")
            syntax_errors.append(file_path)
        except Exception as e:
            print(f"❌ {file_path} - Error: {e}")
            syntax_errors.append(file_path)
    
    return len(syntax_errors) == 0

def main():
    """Run all structure checks"""
    print("🔧 Tenant Migration Structure Check")
    print("="*50)
    
    checks = [
        ("File Structure", check_files_exist),
        ("Dependencies", check_dependencies), 
        ("Model Structure", check_model_structure),
        ("Python Syntax", check_import_syntax)
    ]
    
    results = []
    
    for check_name, check_func in checks:
        print(f"\\n🔍 Running {check_name} check...")
        try:
            result = check_func()
            results.append(result)
        except Exception as e:
            print(f"❌ {check_name} check failed: {e}")
            results.append(False)
    
    print("\\n" + "="*50)
    print("STRUCTURE CHECK SUMMARY")
    print("="*50)
    
    passed = sum(results)
    total = len(results)
    
    print(f"Passed: {passed}/{total}")
    
    if all(results):
        print("🎉 All structure checks passed!")
        print("\\n📖 Next Steps:")
        print("1. Install dependencies: pip install -r Requirements.txt")
        print("2. Set up your .env file with database URLs")
        print("3. Run: python tenant_cli.py --help")
        print("4. Test with: python tenant_cli.py list-tenants --dry-run")
    else:
        print("❌ Some structure checks failed. Please fix the issues above.")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())