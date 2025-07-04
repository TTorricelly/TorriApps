# Multi-Schema Migration Guide

This guide explains how to manage database migrations across multiple schemas (dev, prod, tenant-specific) using the enhanced Alembic setup.

## Overview

The migration system supports:
- **Dev/Prod schemas**: `dev`, `prod` 
- **Multi-tenant schemas**: `tenant-1`, `tenant-2`, etc.
- **Fresh schema resets**: Complete schema recreation
- **Easy schema switching**: Via command line or environment variables

## Quick Start

### 1. Using the Migration Helper Script

```bash
# Reset and initialize dev schema
python migrate.py reset --schema dev

# Reset and initialize prod schema  
python migrate.py reset --schema prod

# Reset and initialize tenant schema
python migrate.py reset --schema tenant-1
```

### 2. Creating New Migrations

```bash
# Create migration for dev schema
python migrate.py revision --schema dev --message "add new feature"

# Create migration for prod schema
python migrate.py revision --schema prod --message "add new feature"
```

### 3. Running Migrations

```bash
# Upgrade dev schema to latest
python migrate.py upgrade --schema dev

# Upgrade prod schema to latest
python migrate.py upgrade --schema prod

# Upgrade to specific revision
python migrate.py upgrade --schema dev --target abc123
```

### 4. Migration Status

```bash
# Check current migration status
python migrate.py current --schema dev

# View migration history
python migrate.py history --schema dev
```

## Direct Alembic Commands

You can also use Alembic directly with schema specification:

```bash
# Upgrade dev schema
alembic -x schema=dev upgrade head

# Upgrade prod schema  
alembic -x schema=prod upgrade head

# Create revision for specific schema
alembic -x schema=dev revision --autogenerate -m "add new feature"

# Upgrade tenant schema
alembic -x schema=tenant-1 upgrade head
```

## Environment Variables

Set these environment variables for default behavior:

```bash
# Set default schema
export ALEMBIC_SCHEMA=dev

# Alternative environment variable
export DEFAULT_SCHEMA_NAME=dev
```

## Schema Management

### Fresh Start Process

1. **Reset Dev Schema**:
   ```bash
   python migrate.py reset --schema dev
   ```

2. **Reset Prod Schema**:
   ```bash
   python migrate.py reset --schema prod
   ```

3. **Create Tenant Schemas**:
   ```bash
   python migrate.py reset --schema tenant-1
   python migrate.py reset --schema tenant-2
   ```

### Schema Switching Workflow

1. **Develop in Dev Schema**:
   ```bash
   # Make model changes
   python migrate.py revision --schema dev --message "add new feature"
   python migrate.py upgrade --schema dev
   ```

2. **Apply to Prod Schema**:
   ```bash
   # Apply same migration to prod
   python migrate.py upgrade --schema prod
   ```

3. **Apply to Tenant Schemas**:
   ```bash
   # Apply to each tenant
   python migrate.py upgrade --schema tenant-1
   python migrate.py upgrade --schema tenant-2
   ```

## Migration Commands Reference

### migrate.py Commands

| Command | Description | Example |
|---------|-------------|---------|
| `reset` | Drop and recreate schema, run all migrations | `python migrate.py reset --schema dev` |
| `revision` | Create new migration | `python migrate.py revision --schema dev -m "message"` |
| `upgrade` | Apply migrations | `python migrate.py upgrade --schema dev` |
| `downgrade` | Rollback migrations | `python migrate.py downgrade --schema dev --target -1` |
| `current` | Show current revision | `python migrate.py current --schema dev` |
| `history` | Show migration history | `python migrate.py history --schema dev` |

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `--schema`, `-s` | Target schema name | `dev` |
| `--message`, `-m` | Migration message | Required for revision |
| `--target`, `-t` | Target revision | `head` |

## Best Practices

1. **Always test in dev first**:
   ```bash
   python migrate.py revision --schema dev -m "new feature"
   python migrate.py upgrade --schema dev
   ```

2. **Keep schemas in sync**:
   ```bash
   # After dev testing, apply to prod
   python migrate.py upgrade --schema prod
   ```

3. **Use descriptive migration messages**:
   ```bash
   python migrate.py revision --schema dev -m "add user preferences table"
   ```

4. **Reset schemas for fresh starts**:
   ```bash
   python migrate.py reset --schema dev
   ```

5. **Check status before making changes**:
   ```bash
   python migrate.py current --schema dev
   ```