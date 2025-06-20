#!/usr/bin/env python3
"""
Database Seed Script for Torri Apps Backend

This script populates the single-schema PostgreSQL database with sample data for development and testing.

SINGLE-SCHEMA ARCHITECTURE:
- PUBLIC SCHEMA: Contains all tables including users, services, appointments, etc.
- Simplified structure without multi-tenancy

WHAT IT CREATES:
1. In PUBLIC schema:
   - Admin Master Users (admin@torriapps.com / admin123)
   - Sample Tenants (Beauty Hub, Glamour Studio, Urban Salon, Luxe Hair)

2. In EACH TENANT schema:
   - User Tenants (Gestors, Professionals, Attendants, Clients)
   - Service Categories (Hair, Nails, Facial, Body, Massage, Makeup)
   - Services with professional assignments
   - Professional Availability schedules
   - Sample Appointments

USAGE:
    python Scripts/seed_data.py [--clean] [--tenant-id <uuid>]
    
OPTIONS:
    --clean     Drop all existing data before seeding (PUBLIC schema only)
    --tenant-id Only seed data for a specific tenant schema

EXAMPLES:
    # Full seeding (creates all schemas and data)
    python Scripts/seed_data.py
    
    # Clean public schema and reseed everything
    python Scripts/seed_data.py --clean
    
    # Seed only specific tenant
    python Scripts/seed_data.py --tenant-id 12345678-1234-1234-1234-123456789abc

CREDENTIALS:
    Admin: admin@torriapps.com / admin123
    All Tenant Users: [email] / password123
"""

import sys
import os
import argparse
from decimal import Decimal
from datetime import date, time, timedelta
from uuid import uuid4, UUID
from typing import List, Optional

# Add the Backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import IntegrityError

from Config.Settings import settings
from Config.Database import BasePublic, Base

# Import models
from Modules.Tenants.models import Tenant
from Modules.AdminMaster.models import AdminMasterUser, AdminMasterRole
from Core.Auth.models import UserTenant
from Core.Auth.constants import UserRole
from Modules.Services.models import Category, Service
from Modules.Availability.models import ProfessionalAvailability, ProfessionalBreak, ProfessionalBlockedTime
from Modules.Availability.constants import DayOfWeek, AvailabilityBlockType
from Modules.Appointments.models import Appointment
from Modules.Appointments.constants import AppointmentStatus

# Import utilities
from Core.Security.hashing import get_password_hash


class DatabaseSeeder:
    """Database seeder class to manage data creation"""
    
    def __init__(self, clean_db: bool = False, target_tenant_id: Optional[UUID] = None):
        self.clean_db = clean_db
        self.target_tenant_id = target_tenant_id
        
        # Create database engines
        self.public_engine = create_engine(settings.public_database_url)
        PublicSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.public_engine)
        self.public_db = PublicSessionLocal()
        
        # Sample data collections
        self.tenants: List[Tenant] = []
        self.admin_users: List[AdminMasterUser] = []
        self.user_tenants: List[UserTenant] = []
        self.categories: List[Category] = []
        self.services: List[Service] = []
        self.professionals: List[UserTenant] = []
        
        print("🔗 Database Seeder initialized with multi-schema support")
    
    def close(self):
        """Close database connections"""
        self.public_db.close()
    
    def create_tenant_schema(self, tenant: Tenant):
        """Create the tenant database schema if it doesn't exist (DEPRECATED - now single schema)"""
        # NOTE: This method is deprecated in the single-schema architecture
        # PostgreSQL connection would be: postgresql://username:password@host:port/database
        # temp_engine = create_engine("postgresql://...")
        pass  # No-op in single schema architecture
        
        with temp_engine.connect() as connection:
            # Create database if it doesn't exist
            connection.execute(text(f"CREATE DATABASE IF NOT EXISTS `{tenant.db_schema_name}`"))
            connection.commit()
        
        temp_engine.dispose()
    
    def get_tenant_engine(self, tenant: Tenant):
        """Create a database engine for a specific tenant schema"""
        # Ensure the schema exists first
        self.create_tenant_schema(tenant)
        
        tenant_url = settings.tenant_url_template.format(schema=tenant.db_schema_name)
        return create_engine(tenant_url)
    
    def _create_tenant_tables_manually(self, tenant_engine):
        """Manually create tenant tables using raw SQL to avoid FK constraint issues"""
        print("  📋 Creating tenant tables manually...")
        
        create_tables_sql = [
            # Users table (no FK to public schema)
            """
            CREATE TABLE IF NOT EXISTS users_tenant (
                id CHAR(36) PRIMARY KEY,
                tenant_id CHAR(36) NOT NULL,
                email VARCHAR(120) NOT NULL,
                hashed_password VARCHAR(255) NOT NULL,
                role ENUM('gestor', 'atendente', 'profissional', 'cliente') NOT NULL,
                full_name VARCHAR(100),
                is_active BOOLEAN DEFAULT TRUE,
                INDEX idx_tenant_email (tenant_id, email),
                UNIQUE KEY uq_user_tenant_email (tenant_id, email)
            )
            """,
            # Service categories (no FK to public schema)
            """
            CREATE TABLE IF NOT EXISTS service_categories (
                id CHAR(36) PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                tenant_id CHAR(36) NOT NULL,
                INDEX idx_tenant_id (tenant_id),
                UNIQUE KEY uq_category_tenant_name (tenant_id, name)
            )
            """,
            # Services table
            """
            CREATE TABLE IF NOT EXISTS services (
                id CHAR(36) PRIMARY KEY,
                name VARCHAR(150) NOT NULL,
                description VARCHAR(500),
                duration_minutes INT NOT NULL,
                price DECIMAL(10,2) NOT NULL,
                commission_percentage DECIMAL(5,2),
                category_id CHAR(36) NOT NULL,
                tenant_id CHAR(36) NOT NULL,
                INDEX idx_category_id (category_id),
                INDEX idx_tenant_id (tenant_id),
                FOREIGN KEY (category_id) REFERENCES service_categories(id) ON DELETE CASCADE,
                UNIQUE KEY uq_service_tenant_name (tenant_id, name)
            )
            """,
            # Service professionals association table
            """
            CREATE TABLE IF NOT EXISTS service_professionals_association (
                service_id CHAR(36) NOT NULL,
                professional_user_id CHAR(36) NOT NULL,
                PRIMARY KEY (service_id, professional_user_id),
                FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
                FOREIGN KEY (professional_user_id) REFERENCES users_tenant(id) ON DELETE CASCADE,
                UNIQUE KEY uq_service_professional (service_id, professional_user_id)
            )
            """,
            # Professional availability table
            """
            CREATE TABLE IF NOT EXISTS professional_availability (
                id CHAR(36) PRIMARY KEY,
                professional_user_id CHAR(36) NOT NULL,
                tenant_id CHAR(36) NOT NULL,
                day_of_week ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday') NOT NULL,
                start_time TIME NOT NULL,
                end_time TIME NOT NULL,
                INDEX idx_professional_day (professional_user_id, day_of_week),
                INDEX idx_tenant_id (tenant_id),
                FOREIGN KEY (professional_user_id) REFERENCES users_tenant(id) ON DELETE CASCADE
            )
            """,
            # Professional breaks table
            """
            CREATE TABLE IF NOT EXISTS professional_breaks (
                id CHAR(36) PRIMARY KEY,
                professional_user_id CHAR(36) NOT NULL,
                tenant_id CHAR(36) NOT NULL,
                day_of_week ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday') NOT NULL,
                start_time TIME NOT NULL,
                end_time TIME NOT NULL,
                name VARCHAR(100),
                INDEX idx_professional_day (professional_user_id, day_of_week),
                INDEX idx_tenant_id (tenant_id),
                FOREIGN KEY (professional_user_id) REFERENCES users_tenant(id) ON DELETE CASCADE
            )
            """,
            # Professional blocked time table
            """
            CREATE TABLE IF NOT EXISTS professional_blocked_time (
                id CHAR(36) PRIMARY KEY,
                professional_user_id CHAR(36) NOT NULL,
                tenant_id CHAR(36) NOT NULL,
                blocked_date DATE NOT NULL,
                start_time TIME NOT NULL,
                end_time TIME NOT NULL,
                reason VARCHAR(255),
                block_type ENUM('break', 'vacation', 'sick_leave', 'other') DEFAULT 'other',
                INDEX idx_professional_date (professional_user_id, blocked_date),
                INDEX idx_tenant_id (tenant_id),
                FOREIGN KEY (professional_user_id) REFERENCES users_tenant(id) ON DELETE CASCADE
            )
            """,
            # Appointments table
            """
            CREATE TABLE IF NOT EXISTS appointments (
                id CHAR(36) PRIMARY KEY,
                client_id CHAR(36) NOT NULL,
                professional_id CHAR(36) NOT NULL,
                service_id CHAR(36) NOT NULL,
                tenant_id CHAR(36) NOT NULL,
                appointment_date DATE NOT NULL,
                start_time TIME NOT NULL,
                end_time TIME NOT NULL,
                status ENUM('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show') DEFAULT 'scheduled',
                price_at_booking DECIMAL(10,2) NOT NULL,
                paid_manually BOOLEAN DEFAULT FALSE,
                notes_by_client TEXT,
                notes_by_professional TEXT,
                INDEX idx_client_id (client_id),
                INDEX idx_professional_id (professional_id),
                INDEX idx_service_id (service_id),
                INDEX idx_tenant_date (tenant_id, appointment_date),
                INDEX idx_appointment_date (appointment_date),
                FOREIGN KEY (client_id) REFERENCES users_tenant(id) ON DELETE CASCADE,
                FOREIGN KEY (professional_id) REFERENCES users_tenant(id) ON DELETE CASCADE,
                FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
            )
            """
        ]
        
        with tenant_engine.connect() as connection:
            for table_sql in create_tables_sql:
                try:
                    connection.execute(text(table_sql))
                    connection.commit()
                except Exception as e:
                    print(f"    ⚠️  Warning creating table: {e}")
        
        print("  ✅ Tenant tables created manually")
    
    def clean_database(self):
        """Clean all existing data from the database"""
        print("🧹 Cleaning existing data...")
        
        try:
            # Clean public schema
            BasePublic.metadata.drop_all(bind=self.public_engine)
            BasePublic.metadata.create_all(bind=self.public_engine)
            
            # Note: For tenant schemas, they would need to be cleaned individually
            # This is a simplified version - in production you'd iterate through existing tenants
            print("✅ Public schema cleaned and recreated")
            print("⚠️  Note: Tenant schemas need to be cleaned individually per tenant")
        except Exception as e:
            print(f"❌ Error cleaning database: {e}")
            raise
    
    def seed_admin_master_users(self):
        """Create admin master users"""
        print("👑 Creating Admin Master Users...")
        
        admin_users_data = [
            {
                "email": "admin@torriapps.com",
                "full_name": "Super Administrator",
                "role": AdminMasterRole.ADMIN_MASTER
            },
            {
                "email": "support@torriapps.com", 
                "full_name": "Support Team Lead",
                "role": AdminMasterRole.ADMIN_MASTER
            }
        ]
        
        for user_data in admin_users_data:
            try:
                admin_user = AdminMasterUser(
                    id=str(uuid4()),
                    email=user_data["email"],
                    hashed_password=get_password_hash("admin123"),  # Default password
                    role=user_data["role"],
                    full_name=user_data["full_name"],
                    is_active=True
                )
                
                self.public_db.add(admin_user)
                self.public_db.commit()  # Commit each user individually
                self.admin_users.append(admin_user)
                print(f"  ✅ Created admin user: {user_data['email']}")
                
            except IntegrityError:
                self.public_db.rollback()
                print(f"  ⚠️  Admin user {user_data['email']} already exists")
    
    def seed_tenants(self):
        """Create sample tenants"""
        print("🏢 Creating Sample Tenants...")
        
        tenants_data = [
            {
                "name": "Beauty Hub Salon",
                "slug": "beauty-hub-salon",
                "db_schema_name": "tenant_beauty_hub",
                "block_size_minutes": 30
            },
            {
                "name": "Glamour Studio",
                "slug": "glamour-studio", 
                "db_schema_name": "tenant_glamour_studio",
                "block_size_minutes": 15
            },
            {
                "name": "Urban Salon & Spa",
                "slug": "urban-salon-spa",
                "db_schema_name": "tenant_urban_salon",
                "block_size_minutes": 30
            },
            {
                "name": "Luxe Hair & Beauty",
                "slug": "luxe-hair-beauty",
                "db_schema_name": "tenant_luxe_hair",
                "block_size_minutes": 20
            }
        ]
        
        for tenant_data in tenants_data:
            try:
                tenant = Tenant(
                    id=str(uuid4()),
                    name=tenant_data["name"],
                    slug=tenant_data["slug"],
                    db_schema_name=tenant_data["db_schema_name"],
                    block_size_minutes=tenant_data["block_size_minutes"]
                )
                
                self.public_db.add(tenant)
                self.public_db.commit()  # Commit each tenant individually
                self.tenants.append(tenant)
                print(f"  ✅ Created tenant: {tenant_data['name']}")
                
            except IntegrityError:
                self.public_db.rollback()
                print(f"  ⚠️  Tenant {tenant_data['name']} already exists")
    
    def seed_user_tenants(self, tenant: Tenant):
        """Create user tenants for a specific tenant"""
        print(f"👥 Creating User Tenants for {tenant.name}...")
        
        # Create tenant-specific database connection
        tenant_engine = self.get_tenant_engine(tenant)
        
        # Ensure tenant schema tables exist
        # For multi-schema setup, we create tables manually to avoid cross-schema FK issues
        try:
            Base.metadata.create_all(bind=tenant_engine, checkfirst=True)
            print("  ✅ Tenant tables created using SQLAlchemy metadata")
        except Exception as e:
            print(f"  ⚠️  SQLAlchemy table creation failed: {e}")
            # Fallback to manual table creation
            self._create_tenant_tables_manually(tenant_engine)
        
        TenantSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=tenant_engine)
        tenant_db = TenantSessionLocal()
        
        users_data = [
            # Gestor (Manager)
            {
                "email": f"gestor@{tenant.slug}.com",
                "full_name": "Manager User",
                "role": UserRole.GESTOR
            },
            # Atendentes (Attendants)
            {
                "email": f"atendente1@{tenant.slug}.com",
                "full_name": "Attendant One",
                "role": UserRole.ATENDENTE
            },
            {
                "email": f"atendente2@{tenant.slug}.com",
                "full_name": "Attendant Two", 
                "role": UserRole.ATENDENTE
            },
            # Profissionais (Professionals)
            {
                "email": f"professional1@{tenant.slug}.com",
                "full_name": "Maria Silva",
                "role": UserRole.PROFISSIONAL
            },
            {
                "email": f"professional2@{tenant.slug}.com",
                "full_name": "João Santos",
                "role": UserRole.PROFISSIONAL
            },
            {
                "email": f"professional3@{tenant.slug}.com",
                "full_name": "Ana Costa",
                "role": UserRole.PROFISSIONAL
            },
            # Clientes (Clients)
            {
                "email": f"client1@{tenant.slug}.com",
                "full_name": "Sarah Johnson",
                "role": UserRole.CLIENTE
            },
            {
                "email": f"client2@{tenant.slug}.com",
                "full_name": "Michael Brown",
                "role": UserRole.CLIENTE
            },
            {
                "email": f"client3@{tenant.slug}.com",
                "full_name": "Emma Wilson",
                "role": UserRole.CLIENTE
            },
            {
                "email": f"client4@{tenant.slug}.com",
                "full_name": "James Davis",
                "role": UserRole.CLIENTE
            }
        ]
        
        tenant_users = []
        professionals = []
        
        for user_data in users_data:
            try:
                user_id = str(uuid4())
                user = UserTenant(
                    id=user_id,
                    tenant_id=tenant.id,
                    email=user_data["email"],
                    hashed_password=get_password_hash("password123"),  # Default password
                    role=user_data["role"],
                    full_name=user_data["full_name"],
                    is_active=True
                )
                
                tenant_db.add(user)
                
                # Store user data as plain dict to avoid session issues
                user_dict = {
                    "id": user_id,
                    "tenant_id": str(tenant.id),
                    "email": user_data["email"],
                    "role": user_data["role"],
                    "full_name": user_data["full_name"]
                }
                tenant_users.append(user_dict)
                
                # Store professionals separately while we have access to the role
                if user_data["role"] == UserRole.PROFISSIONAL:
                    professionals.append(user_dict)
                    self.professionals.append(user_dict)
                
                print(f"  ✅ Created {user_data['role'].value}: {user_data['full_name']}")
                
            except IntegrityError:
                tenant_db.rollback()
                print(f"  ⚠️  User {user_data['email']} already exists")
        
        try:
            tenant_db.commit()
            self.user_tenants.extend(tenant_users)
        finally:
            tenant_db.close()
            
        return tenant_users, professionals
    
    def seed_categories_and_services(self, tenant: Tenant, professionals: List[dict]):
        """Create service categories and services for a tenant"""
        print(f"🎯 Creating Categories and Services for {tenant.name}...")
        
        # Create tenant-specific database connection
        tenant_engine = self.get_tenant_engine(tenant)
        
        categories_data = [
            "Hair Services",
            "Nail Services", 
            "Facial Treatments",
            "Body Treatments",
            "Massage Therapy",
            "Makeup Services"
        ]
        
        tenant_categories = []
        
        # Create categories using raw SQL
        with tenant_engine.connect() as connection:
            for category_name in categories_data:
                try:
                    category_id = str(uuid4())
                    insert_sql = text("""
                        INSERT INTO service_categories (id, name, tenant_id)
                        VALUES (:id, :name, :tenant_id)
                    """)
                    connection.execute(insert_sql, {
                        "id": category_id,
                        "name": category_name,
                        "tenant_id": str(tenant.id)
                    })
                    connection.commit()
                    
                    tenant_categories.append({
                        "id": category_id,
                        "name": category_name,
                        "tenant_id": str(tenant.id)
                    })
                    print(f"  ✅ Created category: {category_name}")
                    
                except Exception as e:
                    connection.rollback()
                    print(f"  ⚠️  Category {category_name} already exists: {e}")
        
        # Create services
        services_data = [
            # Hair Services
            {
                "name": "Women's Haircut & Style",
                "description": "Professional haircut with wash and style",
                "duration_minutes": 60,
                "price": Decimal("45.00"),
                "commission_percentage": Decimal("15.00"),
                "category": "Hair Services"
            },
            {
                "name": "Men's Haircut",
                "description": "Classic men's haircut and styling",
                "duration_minutes": 30,
                "price": Decimal("25.00"),
                "commission_percentage": Decimal("12.00"),
                "category": "Hair Services"
            },
            {
                "name": "Hair Coloring",
                "description": "Full hair color application with conditioning",
                "duration_minutes": 120,
                "price": Decimal("85.00"),
                "commission_percentage": Decimal("20.00"),
                "category": "Hair Services"
            },
            {
                "name": "Highlights",
                "description": "Professional highlighting service",
                "duration_minutes": 90,
                "price": Decimal("75.00"),
                "commission_percentage": Decimal("18.00"),
                "category": "Hair Services"
            },
            # Nail Services
            {
                "name": "Manicure",
                "description": "Complete nail care and polish application",
                "duration_minutes": 45,
                "price": Decimal("30.00"),
                "commission_percentage": Decimal("15.00"),
                "category": "Nail Services"
            },
            {
                "name": "Pedicure",
                "description": "Complete foot care and polish application",
                "duration_minutes": 60,
                "price": Decimal("40.00"),
                "commission_percentage": Decimal("15.00"),
                "category": "Nail Services"
            },
            {
                "name": "Gel Manicure",
                "description": "Long-lasting gel manicure",
                "duration_minutes": 60,
                "price": Decimal("45.00"),
                "commission_percentage": Decimal("18.00"),
                "category": "Nail Services"
            },
            # Facial Treatments
            {
                "name": "Classic Facial",
                "description": "Deep cleansing and moisturizing facial",
                "duration_minutes": 75,
                "price": Decimal("60.00"),
                "commission_percentage": Decimal("20.00"),
                "category": "Facial Treatments"
            },
            {
                "name": "Anti-Aging Facial",
                "description": "Advanced anti-aging treatment",
                "duration_minutes": 90,
                "price": Decimal("85.00"),
                "commission_percentage": Decimal("25.00"),
                "category": "Facial Treatments"
            },
            # Body Treatments
            {
                "name": "Body Waxing - Legs",
                "description": "Full leg waxing service",
                "duration_minutes": 45,
                "price": Decimal("50.00"),
                "commission_percentage": Decimal("16.00"),
                "category": "Body Treatments"
            },
            # Massage Therapy
            {
                "name": "Relaxation Massage",
                "description": "60-minute full body relaxation massage",
                "duration_minutes": 60,
                "price": Decimal("70.00"),
                "commission_percentage": Decimal("22.00"),
                "category": "Massage Therapy"
            },
            # Makeup Services
            {
                "name": "Special Event Makeup",
                "description": "Professional makeup for special occasions",
                "duration_minutes": 45,
                "price": Decimal("55.00"),
                "commission_percentage": Decimal("20.00"),
                "category": "Makeup Services"
            }
        ]
        
        tenant_services = []
        
        # Create services using raw SQL
        with tenant_engine.connect() as connection:
            for service_data in services_data:
                try:
                    # Find the category
                    category = next((c for c in tenant_categories if c["name"] == service_data["category"]), None)
                    if not category:
                        continue
                    
                    service_id = str(uuid4())
                    
                    # Insert service
                    insert_sql = text("""
                        INSERT INTO services (id, name, description, duration_minutes, price, 
                                            commission_percentage, category_id, tenant_id)
                        VALUES (:id, :name, :description, :duration_minutes, :price, 
                                :commission_percentage, :category_id, :tenant_id)
                    """)
                    connection.execute(insert_sql, {
                        "id": service_id,
                        "name": service_data["name"],
                        "description": service_data["description"],
                        "duration_minutes": service_data["duration_minutes"],
                        "price": float(service_data["price"]),
                        "commission_percentage": float(service_data["commission_percentage"]),
                        "category_id": category["id"],
                        "tenant_id": str(tenant.id)
                    })
                    
                    # Assign random professionals to services
                    import random
                    num_professionals = random.randint(1, min(3, len(professionals)))
                    assigned_professionals = random.sample(professionals, num_professionals)
                    
                    for professional in assigned_professionals:
                        assoc_sql = text("""
                            INSERT INTO service_professionals_association (service_id, professional_user_id)
                            VALUES (:service_id, :professional_user_id)
                        """)
                        connection.execute(assoc_sql, {
                            "service_id": service_id,
                            "professional_user_id": professional["id"]
                        })
                    
                    connection.commit()
                    
                    tenant_services.append({
                        "id": service_id,
                        "name": service_data["name"],
                        "tenant_id": str(tenant.id)
                    })
                    print(f"  ✅ Created service: {service_data['name']} (assigned to {num_professionals} professionals)")
                    
                except Exception as e:
                    connection.rollback()
                    print(f"  ⚠️  Service {service_data['name']} already exists: {e}")
        
        self.categories.extend(tenant_categories)
        self.services.extend(tenant_services)
            
        return tenant_services
    
    def seed_professional_availability(self, tenant: Tenant, professionals: List[dict]):
        """Create professional availability schedules"""
        print(f"📅 Creating Professional Availability for {tenant.name}...")
        
        # Create tenant-specific database connection
        tenant_engine = self.get_tenant_engine(tenant)
        
        with tenant_engine.connect() as connection:
            for professional in professionals:
                # Create weekly availability (Monday to Saturday)
                availability_schedule = [
                    ("monday", time(9, 0), time(18, 0)),
                    ("tuesday", time(9, 0), time(18, 0)),
                    ("wednesday", time(9, 0), time(18, 0)),
                    ("thursday", time(9, 0), time(19, 0)),  # Later on Thursday
                    ("friday", time(9, 0), time(19, 0)),    # Later on Friday
                    ("saturday", time(10, 0), time(16, 0))  # Shorter Saturday
                ]
                
                for day_of_week, start_time, end_time in availability_schedule:
                    try:
                        availability_sql = text("""
                            INSERT INTO professional_availability 
                            (id, professional_user_id, tenant_id, day_of_week, start_time, end_time)
                            VALUES (:id, :professional_user_id, :tenant_id, :day_of_week, :start_time, :end_time)
                        """)
                        connection.execute(availability_sql, {
                            "id": str(uuid4()),
                            "professional_user_id": professional["id"],
                            "tenant_id": str(tenant.id),
                            "day_of_week": day_of_week,
                            "start_time": start_time,
                            "end_time": end_time
                        })
                        
                    except Exception as e:
                        print(f"    ⚠️  Warning creating availability: {e}")
                        continue
                
                # Add lunch breaks
                lunch_breaks = [
                    ("monday", time(12, 0), time(13, 0)),
                    ("tuesday", time(12, 0), time(13, 0)),
                    ("wednesday", time(12, 0), time(13, 0)),
                    ("thursday", time(12, 0), time(13, 0)),
                    ("friday", time(12, 0), time(13, 0))
                ]
                
                for day_of_week, start_time, end_time in lunch_breaks:
                    try:
                        break_sql = text("""
                            INSERT INTO professional_breaks 
                            (id, professional_user_id, tenant_id, day_of_week, start_time, end_time, name)
                            VALUES (:id, :professional_user_id, :tenant_id, :day_of_week, :start_time, :end_time, :name)
                        """)
                        connection.execute(break_sql, {
                            "id": str(uuid4()),
                            "professional_user_id": professional["id"],
                            "tenant_id": str(tenant.id),
                            "day_of_week": day_of_week,
                            "start_time": start_time,
                            "end_time": end_time,
                            "name": "Lunch Break"
                        })
                        
                    except Exception as e:
                        print(f"    ⚠️  Warning creating break: {e}")
                        continue
                
                print(f"  ✅ Created availability for: {professional['full_name']}")
            
            connection.commit()
    
    def seed_sample_appointments(self, tenant: Tenant, tenant_users: List[dict], services: List[dict]):
        """Create sample appointments"""
        print(f"📋 Creating Sample Appointments for {tenant.name}...")
        
        # Create tenant-specific database connection
        tenant_engine = self.get_tenant_engine(tenant)
        
        # Filter users by role
        professionals = [user for user in tenant_users if user["role"] == UserRole.PROFISSIONAL]
        clients = [user for user in tenant_users if user["role"] == UserRole.CLIENTE]
        
        if not professionals or not clients or not services:
            print("  ⚠️  Not enough data to create appointments")
            return
        
        import random
        
        with tenant_engine.connect() as connection:
            # Get service details and professionals from database
            service_details = {}
            for service in services:
                # Get professionals assigned to this service
                prof_sql = text("""
                    SELECT professional_user_id FROM service_professionals_association 
                    WHERE service_id = :service_id
                """)
                result = connection.execute(prof_sql, {"service_id": service["id"]})
                assigned_prof_ids = [row[0] for row in result.fetchall()]
                
                # Get service duration and price
                service_sql = text("""
                    SELECT duration_minutes, price FROM services WHERE id = :service_id
                """)
                service_result = connection.execute(service_sql, {"service_id": service["id"]})
                service_row = service_result.fetchone()
                
                if service_row and assigned_prof_ids:
                    service_details[service["id"]] = {
                        "name": service["name"],
                        "duration_minutes": service_row[0],
                        "price": float(service_row[1]),
                        "professional_ids": assigned_prof_ids
                    }
            
            # Create appointments for the next 30 days
            for i in range(15):  # Create 15 sample appointments
                try:
                    # Random date in the next 30 days (but not weekend)
                    random_days = random.randint(1, 30)
                    appointment_date = date.today() + timedelta(days=random_days)
                    
                    # Skip weekends
                    if appointment_date.weekday() >= 6:  # Saturday = 5, Sunday = 6
                        continue
                    
                    # Random time between 10 AM and 5 PM
                    start_hour = random.randint(10, 16)
                    start_minute = random.choice([0, 30])
                    start_time = time(start_hour, start_minute)
                    
                    # Random service
                    service_id = random.choice(list(service_details.keys()))
                    service_info = service_details[service_id]
                    
                    # Random professional from those who offer this service
                    professional_id = random.choice(service_info["professional_ids"])
                    
                    # Random client
                    client = random.choice(clients)
                    
                    # Calculate end time
                    from datetime import datetime
                    start_datetime = datetime.combine(appointment_date, start_time)
                    end_datetime = start_datetime + timedelta(minutes=service_info["duration_minutes"])
                    end_time = end_datetime.time()
                    
                    # Random status (mostly scheduled, some completed)
                    status_choices = ["scheduled", "completed", "cancelled"]
                    status = random.choices(status_choices, weights=[70, 25, 5])[0]
                    
                    # Insert appointment
                    appointment_sql = text("""
                        INSERT INTO appointments 
                        (id, client_id, professional_id, service_id, tenant_id, appointment_date, 
                         start_time, end_time, status, price_at_booking, paid_manually, notes_by_client)
                        VALUES (:id, :client_id, :professional_id, :service_id, :tenant_id, :appointment_date,
                                :start_time, :end_time, :status, :price_at_booking, :paid_manually, :notes_by_client)
                    """)
                    
                    notes_options = [None, "First time client", "Regular appointment", "Special occasion", "Please use gentle products"]
                    
                    connection.execute(appointment_sql, {
                        "id": str(uuid4()),
                        "client_id": client["id"],
                        "professional_id": professional_id,
                        "service_id": service_id,
                        "tenant_id": str(tenant.id),
                        "appointment_date": appointment_date,
                        "start_time": start_time,
                        "end_time": end_time,
                        "status": status,
                        "price_at_booking": service_info["price"],
                        "paid_manually": random.choice([True, False]),
                        "notes_by_client": random.choice(notes_options)
                    })
                    
                    print(f"  ✅ Created appointment: {service_info['name']} on {appointment_date}")
                    
                except Exception as e:
                    print(f"    ⚠️  Warning creating appointment: {e}")
                    continue
            
            connection.commit()
    
    def run(self):
        """Run the complete seeding process"""
        print("🌱 Starting Database Seeding Process...")
        print("=" * 50)
        
        try:
            if self.clean_db:
                self.clean_database()
            
            # Seed admin users (only if not targeting specific tenant)
            if not self.target_tenant_id:
                self.seed_admin_master_users()
                self.seed_tenants()
            
            # Process tenants
            tenants_to_process = []
            if self.target_tenant_id:
                # Find specific tenant
                tenant = self.public_db.query(Tenant).filter(Tenant.id == self.target_tenant_id).first()
                if tenant:
                    tenants_to_process = [tenant]
                else:
                    print(f"❌ Tenant with ID {self.target_tenant_id} not found")
                    return
            else:
                # Process all tenants
                tenants_to_process = self.tenants
            
            # Seed data for each tenant
            for tenant in tenants_to_process:
                print(f"\n🏢 Processing tenant: {tenant.name}")
                print("-" * 30)
                
                # Create users for this tenant
                tenant_users, professionals = self.seed_user_tenants(tenant)
                
                if professionals:
                    # Create services and categories
                    services = self.seed_categories_and_services(tenant, professionals)
                    
                    # Create availability
                    self.seed_professional_availability(tenant, professionals)
                    
                    # Create sample appointments
                    self.seed_sample_appointments(tenant, tenant_users, services)
                else:
                    print("  ⚠️  No professionals found, skipping services and appointments")
            
            print("\n" + "=" * 50)
            print("🎉 Database seeding completed successfully!")
            self.print_summary()
            
        except Exception as e:
            print(f"\n❌ Error during seeding: {e}")
            self.public_db.rollback()
            raise
        finally:
            self.close()
    
    def print_summary(self):
        """Print a summary of created data"""
        print("\n📊 Seeding Summary:")
        print(f"  👑 Admin Users: {len(self.admin_users)}")
        print(f"  🏢 Tenants: {len(self.tenants)}")
        print(f"  👥 User Tenants: {len(self.user_tenants)}")
        print(f"  🎯 Categories: {len(self.categories)}")
        print(f"  🛎️  Services: {len(self.services)}")
        print(f"  👨‍💼 Professionals: {len(self.professionals)}")
        
        print("\n🔐 Default Credentials:")
        print("  Admin Users: admin@torriapps.com / admin123")
        print("  All Tenant Users: [email] / password123")


def main():
    """Main function to run the seeder"""
    parser = argparse.ArgumentParser(description="Seed the database with sample data")
    parser.add_argument("--clean", action="store_true", help="Clean existing data before seeding")
    parser.add_argument("--tenant-id", type=str, help="Only seed data for specific tenant ID")
    
    args = parser.parse_args()
    
    target_tenant_id = None
    if args.tenant_id:
        try:
            target_tenant_id = UUID(args.tenant_id)
        except ValueError:
            print("❌ Invalid tenant ID format. Please provide a valid UUID.")
            sys.exit(1)
    
    seeder = DatabaseSeeder(clean_db=args.clean, target_tenant_id=target_tenant_id)
    seeder.run()


if __name__ == "__main__":
    main()