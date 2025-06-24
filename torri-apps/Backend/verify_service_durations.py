#!/usr/bin/env python3
"""
Script to verify service durations in the database
"""
import sys
import os
sys.path.append(os.getcwd())

from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine, text
from Config.Database import get_db
from Modules.Services.models import Service
from decimal import Decimal

def verify_service_durations():
    """Check actual service data in database to verify duration_minutes values"""
    
    # Get database session
    db_gen = get_db()
    db = next(db_gen)

    try:
        # Query services with their duration_minutes
        services = db.query(Service).filter(Service.is_active == True).limit(10).all()
        
        print('Current Services in Database:')
        print('=' * 60)
        
        if not services:
            print('No active services found in database')
        else:
            for service in services:
                print(f'Service: {service.name}')
                print(f'  ID: {service.id}')
                print(f'  Duration: {service.duration_minutes} minutes')
                print(f'  Price: ${service.price}')
                print(f'  Category ID: {service.category_id}')
                print(f'  Active: {service.is_active}')
                print()
        
        # Check total count
        total_count = db.query(Service).filter(Service.is_active == True).count()
        print(f'Total active services: {total_count}')
        
        # Check for any services with invalid durations
        invalid_duration_services = db.query(Service).filter(
            Service.is_active == True,
            (Service.duration_minutes <= 0)
            | (Service.duration_minutes.is_(None))
        ).all()

        if invalid_duration_services:
            print('\n⚠️  Services with invalid durations:')
            print('-' * 40)
            for service in invalid_duration_services:
                print(f'  {service.name}: {service.duration_minutes} minutes')
        else:
            print('\n✅ All active services have valid duration_minutes values')
    except Exception as e:
        print(f'Error querying services: {e}')
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    verify_service_durations()
