#!/usr/bin/env python3
"""
Script to seed initial company data.
Run this after creating the company table to add sample data.
"""
import sys
import os
from datetime import datetime

# Add the Backend directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from Config.Settings import settings
from Modules.Company.models import Company
from Core.Database.base import Base
from Core.Utils.Helpers import normalize_phone_number

def create_sample_company():
    """Create a sample company entry."""
    # Create database engine
    engine = create_engine(settings.database_url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)
    
    # Create session
    db = SessionLocal()
    
    try:
        # Check if company already exists
        existing_company = db.query(Company).first()
        if existing_company:
            print(f"Company already exists: {existing_company.name}")
            return
        
        # Create sample company
        sample_company = Company(
            name="Salão Belle Époque",
            logo_url="https://example.com/logo.png",
            contact_email="contato@belleepoque.com",
            contact_phone=normalize_phone_number("+55 11 99999-9999"),
            is_active=True
        )
        
        db.add(sample_company)
        db.commit()
        db.refresh(sample_company)
        
        print(f"Sample company created successfully!")
        print(f"ID: {sample_company.id}")
        print(f"Name: {sample_company.name}")
        print(f"Contact Email: {sample_company.contact_email}")
        print(f"Contact Phone: {sample_company.contact_phone}")
        
    except Exception as e:
        print(f"Error creating company: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_sample_company()