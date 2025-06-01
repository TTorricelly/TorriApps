# Tenant Migration Guide

## Overview

The Tenant Migration Module provides a complete solution for managing multi-tenant database schemas in the TorriApps platform. It supports both public schema (catalog) and tenant-specific schema migrations.

## Quick Start

### 1. Install Dependencies
```bash
pip install -r Requirements.txt
```

### 2. Environment Setup
Add to your `.env` file:
```bash
# Database URLs
DATABASE_URL=mysql+mysqlconnector://root:@localhost:3306/torri_app_public
PUBLIC_DATABASE_URL=mysql+mysqlconnector://root:@localhost:3306/torri_app_public
TENANT_URL_TEMPLATE=mysql+mysqlconnector://root:@localhost:3306/{schema}

# Other settings
SECRET_KEY=your-secret-key
REDIS_URL=redis://localhost:6379
TENANT_ENGINE_POOL_SIZE=3
```

### 3. CLI Usage

```bash
# Show available commands
python tenant_cli.py --help

# Create and migrate a new tenant schema
python tenant_cli.py create tenant_alpha

# Migrate all existing tenants
python tenant_cli.py upgrade-all

# Migrate public schema (catalog tables)
python tenant_cli.py upgrade-public

# List all tenant schemas
python tenant_cli.py list-tenants

# Dry run mode (preview without executing)
python tenant_cli.py create tenant_beta --dry-run
python tenant_cli.py upgrade-all --dry-run

# Continue on errors during batch migration
python tenant_cli.py upgrade-all --continue-on-error
```

## Architecture

### Dual-Metadata Design

The system uses two SQLAlchemy metadata objects:

- **BasePublic.metadata**: Contains catalog tables (`tenants`, `admin_master_users`)
- **Base.metadata**: Contains tenant-specific tables (`users_tenant`, `services`, `appointments`, etc.)

### Schema Structure

```
torri_app_public/          # Public database
├── tenants                # Tenant catalog
├── admin_master_users     # Super admin users
└── alembic_version        # Public schema migration tracking

tenant_alpha/              # Tenant-specific database
├── users_tenant           # Tenant users
├── services               # Tenant services
├── appointments           # Tenant appointments
├── professional_availabilities
├── service_categories
└── alembic_version        # Tenant schema migration tracking
```

## Alembic Integration

### Generate Migrations

```bash
# Generate public schema migration
alembic -x metadata_choice=public revision --autogenerate -m "create_public_tables"

# Generate tenant schema migration
alembic -x metadata_choice=tenant revision --autogenerate -m "create_tenant_tables"
```

### Manual Migration Commands

```bash
# Migrate public schema manually
alembic -x metadata_choice=public upgrade head

# Migrate specific tenant schema manually
alembic -x metadata_choice=tenant -x version_table_schema=tenant_alpha upgrade head
```

## Programmatic Usage

```python
from Core.TenantMigration.service import create_schema_and_migrate, migrate_all

# Create and migrate a single tenant
success = create_schema_and_migrate("tenant_new_salon")

# Migrate all tenants
results = migrate_all()
print(f"Migrated {results['successful_migrations']} tenants")

# Migrate public schema
from Core.TenantMigration.service import migrate_public_schema
migrate_public_schema()
```

## Error Handling

The system includes:

- **Retry Logic**: 3 attempts with exponential backoff for transient errors
- **Comprehensive Logging**: Structured logs for all operations
- **Error Recovery**: Continue-on-error mode for batch operations
- **Dry Run Mode**: Preview operations without executing

## Model Structure

### Public Schema Models (BasePublic)
- `Tenant`: Tenant catalog with schema references
- `AdminMasterUser`: Super admin users

### Tenant Schema Models (Base)
- `UserTenant`: Tenant-specific users (clients, professionals)
- `Service`: Services offered by the tenant
- `Category`: Service categories
- `Appointment`: Booking records
- `ProfessionalAvailability`: Staff availability schedules
- `ProfessionalBreak`: Staff break schedules
- `ProfessionalBlockedTime`: Staff blocked time periods

## MySQL Compatibility

All models are optimized for MySQL:
- UUIDs stored as `CHAR(36)` for compatibility
- Explicit string lengths for VARCHAR columns
- Proper foreign key relationships across schemas

## Troubleshooting

### Common Issues

1. **Import Errors**: Ensure all dependencies are installed
2. **Connection Errors**: Verify database URLs in `.env`
3. **Migration Conflicts**: Check Alembic revision history
4. **Schema Permissions**: Ensure database user has CREATE privileges

### Debug Mode

```bash
# Enable verbose logging
python tenant_cli.py create tenant_test --verbose

# Check structure
python check_structure.py

# Dry run to preview
python tenant_cli.py upgrade-all --dry-run
```

## Best Practices

1. **Always use dry-run first** to preview migrations
2. **Backup databases** before running migrations
3. **Test migrations** on development environment first
4. **Monitor logs** for any errors or warnings
5. **Use continue-on-error** for production batch migrations only when safe

## Security Notes

- Database credentials are read from environment variables
- No sensitive data is logged
- Schema isolation prevents cross-tenant data access
- Foreign key constraints maintain data integrity