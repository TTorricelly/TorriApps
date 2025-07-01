# Multi-Schema Migration Guide

This guide explains how to manage database migrations across multiple PostgreSQL schemas in the TorriApps backend.

## 🏗️ Architecture Overview

The TorriApps backend uses a **single PostgreSQL database with multiple schemas** approach:

- **Database**: `postgres` (single database)
- **Schemas**: `dev`, `prod`, `public` (multiple schemas for environments)
- **Search Path**: Dynamically set based on `DEFAULT_SCHEMA_NAME` environment variable

## 📋 Current Migration Status

### ✅ CPF and Address Fields Migration

**Migration ID**: `add_cpf_and_address`
**Status**: ✅ **APPLIED** to both `dev` and `prod` schemas

## 🛠️ Migration Tools

### 1. Multi-Schema Migration Script

**Location**: `Scripts/multi_schema_migration.py`

**Usage Examples**:

```bash
# Check current migration status
python Scripts/multi_schema_migration.py --schemas dev,prod --action current

# Apply latest migrations to production
python Scripts/multi_schema_migration.py --schemas prod --action upgrade

# Apply specific migration
python Scripts/multi_schema_migration.py --schemas dev --action upgrade --target add_cpf_and_address

# Rollback to specific migration
python Scripts/multi_schema_migration.py --schemas prod --action rollback --target 8285db59cac3

# Dry run (show what would be done)
python Scripts/multi_schema_migration.py --schemas prod --action upgrade --dry-run
```

### 2. Production Migration Script

**Location**: `Scripts/migrate_to_prod.sh`

```bash
# Interactive production migration
./Scripts/migrate_to_prod.sh

# Automated (for CI/CD)
./Scripts/migrate_to_prod.sh --auto-confirm

# Dry run
./Scripts/migrate_to_prod.sh --dry-run
```

## 🔄 Best Practices for Multi-Schema Migrations

### 1. Development Workflow

```bash
# 1. Create migration (always test in dev first)
alembic revision --autogenerate -m "your_migration_description"

# 2. Apply to dev schema
DEFAULT_SCHEMA_NAME=dev alembic upgrade head

# 3. Test thoroughly in dev environment

# 4. Apply to prod using multi-schema tools
python Scripts/multi_schema_migration.py --schemas prod --action upgrade
```

### 2. Schema Environment Variables

```bash
# For development
export DEFAULT_SCHEMA_NAME=dev

# For production
export DEFAULT_SCHEMA_NAME=prod
```

### 3. Safety Guidelines

#### ⚠️ Before Production Migrations:
1. **✅ Test in dev/staging**
2. **✅ Backup database**
3. **✅ Check migration status**
4. **✅ Plan downtime**
5. **✅ Have rollback plan**

## 🚨 Emergency Procedures

### Rolling Back a Migration

```bash
# 1. Identify the previous migration ID
python Scripts/multi_schema_migration.py --schemas prod --action current

# 2. Rollback to previous migration
python Scripts/multi_schema_migration.py --schemas prod --action rollback --target PREVIOUS_MIGRATION_ID

# 3. Verify rollback
python Scripts/multi_schema_migration.py --schemas prod --action current
```
EOF < /dev/null