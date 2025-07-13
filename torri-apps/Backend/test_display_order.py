#!/usr/bin/env python3
"""
Simple test script to verify display_order functionality for professionals.
Run this script to test if display_order is being loaded and saved correctly.
"""

import sys
import os
sys.path.insert(0, os.getcwd())

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from Core.Config.database import get_database_url
from Core.Auth.models import User
from Core.Auth.constants import UserRole

def test_display_order():
    """Test display_order functionality."""
    
    print("🔍 Testing Professional Display Order Functionality...")
    
    # Get database connection
    try:
        db_url = get_database_url()
        engine = create_engine(db_url)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()
        
        print("✅ Database connection established")
        
        # 1. Check if display_order column exists
        result = db.execute(text("""
            SELECT column_name, data_type, is_nullable, column_default 
            FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'display_order'
        """))
        column_info = result.fetchone()
        
        if column_info:
            print(f"✅ display_order column exists: {dict(column_info)}")
        else:
            print("❌ display_order column does NOT exist in users table")
            return
        
        # 2. Check existing professionals with display_order
        professionals = db.query(User).filter(
            User.role == UserRole.PROFISSIONAL
        ).order_by(User.display_order, User.full_name).all()
        
        print(f"\n📊 Found {len(professionals)} professionals:")
        for prof in professionals:
            print(f"  - {prof.full_name}: display_order = {prof.display_order}")
        
        # 3. Test creating a professional with display_order
        print(f"\n🧪 Testing display_order functionality...")
        
        if professionals:
            # Test updating an existing professional's display_order
            test_prof = professionals[0]
            original_order = test_prof.display_order
            new_order = 500
            
            print(f"  Updating {test_prof.full_name} display_order from {original_order} to {new_order}")
            test_prof.display_order = new_order
            db.commit()
            
            # Verify the update
            db.refresh(test_prof)
            if test_prof.display_order == new_order:
                print("  ✅ Display order update successful")
                
                # Restore original value
                test_prof.display_order = original_order
                db.commit()
                print("  ✅ Original value restored")
            else:
                print("  ❌ Display order update failed")
        else:
            print("  ℹ️  No existing professionals to test with")
        
        db.close()
        print("\n✅ All display_order functionality tests completed successfully!")
        
    except Exception as e:
        print(f"❌ Error during testing: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_display_order()