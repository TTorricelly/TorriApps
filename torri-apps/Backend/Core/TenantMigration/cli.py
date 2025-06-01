"""
Tenant Migration CLI

Command-line interface for tenant schema creation and migration operations.
"""

import logging
import sys
from typing import Optional

import click

from .service import (
    create_schema_and_migrate,
    migrate_all,
    migrate_public_schema,
    get_tenant_schemas,
    clean_alembic_state,
    TenantMigrationError
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@click.group()
@click.option('--verbose', '-v', is_flag=True, help='Enable verbose logging')
def cli(verbose: bool):
    """
    Tenant Migration CLI Tool
    
    Manage tenant schema creation and migrations for multi-tenant applications.
    """
    if verbose:
        logging.getLogger().setLevel(logging.DEBUG)
        logger.debug("Verbose logging enabled")


@cli.command()
@click.argument('schema_name')
@click.option('--dry-run', is_flag=True, help='Show what would be done without executing')
def create(schema_name: str, dry_run: bool):
    """
    Create a tenant schema and run migrations.
    
    SCHEMA_NAME: Name of the tenant schema to create (e.g., 'tenant_alpha')
    """
    try:
        if dry_run:
            click.echo(f"[DRY RUN] Would create schema: {schema_name}")
            click.echo(f"[DRY RUN] Would run tenant migrations for: {schema_name}")
            return
        
        click.echo(f"Creating and migrating tenant schema: {schema_name}")
        
        success = create_schema_and_migrate(schema_name)
        
        if success:
            click.echo(f"✅ Successfully created and migrated schema: {schema_name}")
        else:
            click.echo(f"❌ Failed to create/migrate schema: {schema_name}")
            sys.exit(1)
            
    except TenantMigrationError as e:
        click.echo(f"❌ Migration error: {e}")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        click.echo(f"❌ Unexpected error: {e}")
        sys.exit(1)


@cli.command()
@click.option('--dry-run', is_flag=True, help='Show what would be done without executing')
@click.option('--continue-on-error', is_flag=True, help='Continue processing even if some tenants fail')
def upgrade_all(dry_run: bool, continue_on_error: bool):
    """
    Migrate all tenant schemas found in the public.tenants table.
    """
    try:
        if dry_run:
            schemas = get_tenant_schemas()
            click.echo(f"[DRY RUN] Would migrate {len(schemas)} tenant schemas:")
            for schema in schemas:
                click.echo(f"  - {schema}")
            return
        
        click.echo("Starting batch migration for all tenants...")
        
        results = migrate_all()
        
        # Display summary
        click.echo("\n" + "="*50)
        click.echo("MIGRATION SUMMARY")
        click.echo("="*50)
        click.echo(f"Total tenants: {results['total_tenants']}")
        click.echo(f"Successful migrations: {results['successful_migrations']}")
        click.echo(f"Failed migrations: {results['failed_migrations']}")
        
        # Show successful migrations
        if results['successes']:
            click.echo(f"\n✅ Successful migrations ({len(results['successes'])}):")
            for success in results['successes']:
                click.echo(f"  • {success['tenant_name']} ({success['schema_name']})")
        
        # Show failed migrations
        if results['failures']:
            click.echo(f"\n❌ Failed migrations ({len(results['failures'])}):")
            for failure in results['failures']:
                if 'tenant_name' in failure:
                    click.echo(f"  • {failure['tenant_name']} ({failure['schema_name']}): {failure['error']}")
                else:
                    click.echo(f"  • {failure['error']}")
        
        # Exit with error code if any failures occurred and continue_on_error is False
        if results['failed_migrations'] > 0 and not continue_on_error:
            click.echo(f"\n❌ {results['failed_migrations']} migrations failed. Use --continue-on-error to ignore failures.")
            sys.exit(1)
        elif results['failed_migrations'] > 0:
            click.echo(f"\n⚠️  {results['failed_migrations']} migrations failed, but continuing due to --continue-on-error flag.")
        else:
            click.echo(f"\n🎉 All {results['successful_migrations']} tenant migrations completed successfully!")
            
    except Exception as e:
        logger.error(f"Batch migration failed: {e}")
        click.echo(f"❌ Batch migration failed: {e}")
        sys.exit(1)


@cli.command()
@click.option('--dry-run', is_flag=True, help='Show what would be done without executing')
def upgrade_public(dry_run: bool):
    """
    Run migrations for the public schema (catalogue tables).
    """
    try:
        if dry_run:
            click.echo("[DRY RUN] Would run public schema migrations")
            return
        
        click.echo("Running public schema migrations...")
        
        success = migrate_public_schema()
        
        if success:
            click.echo("✅ Successfully migrated public schema")
        else:
            click.echo("❌ Failed to migrate public schema")
            sys.exit(1)
            
    except TenantMigrationError as e:
        click.echo(f"❌ Public migration error: {e}")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        click.echo(f"❌ Unexpected error: {e}")
        sys.exit(1)


@cli.command()
def list_tenants():
    """
    List all tenant schemas from the public.tenants table.
    """
    try:
        schemas = get_tenant_schemas()
        
        if not schemas:
            click.echo("No tenant schemas found.")
            return
        
        click.echo(f"Found {len(schemas)} tenant schemas:")
        for i, schema in enumerate(schemas, 1):
            click.echo(f"  {i:2d}. {schema}")
            
    except Exception as e:
        logger.error(f"Failed to list tenants: {e}")
        click.echo(f"❌ Failed to list tenants: {e}")
        sys.exit(1)


@cli.command()
@click.argument('schema_name')
def status(schema_name: str):
    """
    Check the migration status of a specific tenant schema.
    
    SCHEMA_NAME: Name of the tenant schema to check
    """
    try:
        # This is a placeholder - you could extend this to check Alembic revision status
        click.echo(f"Checking status for schema: {schema_name}")
        click.echo("Note: Detailed status checking not yet implemented")
        click.echo("You can use 'alembic current' with appropriate configuration for detailed status")
        
    except Exception as e:
        logger.error(f"Failed to check status: {e}")
        click.echo(f"❌ Failed to check status: {e}")
        sys.exit(1)


@cli.command()
@click.option('--dry-run', is_flag=True, help='Show what would be done without executing')
@click.option('--confirm', is_flag=True, help='Skip confirmation prompt')
def clean_state(dry_run: bool, confirm: bool):
    """
    Clean up alembic_version tables from all databases to reset migration state.
    
    This removes all Alembic version tracking, allowing you to start fresh.
    Use this when you have migration conflicts or want to reset the system.
    """
    try:
        if dry_run:
            click.echo("[DRY RUN] Would clean alembic_version tables from:")
            click.echo("  - Public database (torri_app_public)")
            schemas = get_tenant_schemas()
            for schema in schemas:
                click.echo(f"  - Tenant schema: {schema}")
            return
        
        if not confirm:
            click.echo("⚠️  This will remove all Alembic version tracking from:")
            click.echo("   • Public database")
            click.echo("   • All tenant schemas")
            click.echo("")
            if not click.confirm("Are you sure you want to continue?"):
                click.echo("Operation cancelled.")
                return
        
        click.echo("Cleaning Alembic state...")
        
        success = clean_alembic_state()
        
        if success:
            click.echo("✅ Successfully cleaned Alembic state")
            click.echo("")
            click.echo("📋 Next steps:")
            click.echo("1. Generate fresh migrations:")
            click.echo("   alembic -x metadata_choice=public revision --autogenerate -m 'initial_public'")
            click.echo("   alembic -x metadata_choice=tenant revision --autogenerate -m 'initial_tenant'")
            click.echo("2. Try creating tenant again:")
            click.echo("   python tenant_cli.py create tenant_alpha")
        else:
            click.echo("❌ Failed to clean Alembic state")
            sys.exit(1)
            
    except Exception as e:
        logger.error(f"Clean state failed: {e}")
        click.echo(f"❌ Clean state failed: {e}")
        sys.exit(1)


if __name__ == '__main__':
    cli()