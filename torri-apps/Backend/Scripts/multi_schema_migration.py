#!/usr/bin/env python3
"""
Multi-Schema Migration Script for TorriApps Backend

This script applies Alembic migrations to multiple schemas in the same PostgreSQL database.
It's designed to handle dev, staging, prod, and any other schemas consistently.

Usage:
    python Scripts/multi_schema_migration.py --schemas dev,prod --action upgrade
    python Scripts/multi_schema_migration.py --schemas dev --action current
    python Scripts/multi_schema_migration.py --schemas prod --action upgrade --target add_cpf_and_address
    python Scripts/multi_schema_migration.py --schemas dev,prod --action rollback --target 8285db59cac3
"""

import os
import sys
import argparse
import subprocess
import logging
from typing import List, Optional
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError

# Add the parent directory to sys.path to import our modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from Config.Settings import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('migration.log')
    ]
)
logger = logging.getLogger(__name__)

class MultiSchemaMigrator:
    """Handles migrations across multiple PostgreSQL schemas."""
    
    def __init__(self, base_database_url: str):
        self.base_database_url = base_database_url
        self.engine = create_engine(base_database_url)
    
    def verify_schema_exists(self, schema_name: str) -> bool:
        """Check if a schema exists in the database."""
        try:
            with self.engine.connect() as conn:
                result = conn.execute(
                    text("SELECT schema_name FROM information_schema.schemata WHERE schema_name = :schema"),
                    {"schema": schema_name}
                )
                exists = result.fetchone() is not None
                logger.info(f"Schema '{schema_name}': {'EXISTS' if exists else 'NOT FOUND'}")
                return exists
        except SQLAlchemyError as e:
            logger.error(f"Error checking schema '{schema_name}': {e}")
            return False
    
    def create_schema_if_not_exists(self, schema_name: str) -> bool:
        """Create schema if it doesn't exist."""
        try:
            with self.engine.connect() as conn:
                conn.execute(text(f"CREATE SCHEMA IF NOT EXISTS {schema_name}"))
                conn.commit()
                logger.info(f"✅ Schema '{schema_name}' ensured to exist")
                return True
        except SQLAlchemyError as e:
            logger.error(f"❌ Error creating schema '{schema_name}': {e}")
            return False
    
    def get_current_migration(self, schema_name: str) -> Optional[str]:
        """Get the current migration revision for a schema."""
        original_schema = os.environ.get('DEFAULT_SCHEMA_NAME', 'public')
        
        try:
            # Temporarily set the schema for this operation
            os.environ['DEFAULT_SCHEMA_NAME'] = schema_name
            
            result = subprocess.run(
                ['alembic', 'current'],
                capture_output=True,
                text=True,
                check=False
            )
            
            if result.returncode == 0:
                # Parse the output to extract revision
                output = result.stdout.strip()
                if output and 'head' in output:
                    # Extract revision ID from output like "add_cpf_and_address (head)"
                    revision = output.split()[0] if output.split() else "No migration"
                    logger.info(f"Schema '{schema_name}' current migration: {revision}")
                    return revision
                else:
                    logger.info(f"Schema '{schema_name}' has no migrations applied")
                    return None
            else:
                logger.warning(f"Could not get current migration for schema '{schema_name}': {result.stderr}")
                return None
                
        finally:
            # Restore original schema
            os.environ['DEFAULT_SCHEMA_NAME'] = original_schema
    
    def apply_migration(self, schema_name: str, action: str, target: Optional[str] = None) -> bool:
        """Apply migration to a specific schema."""
        original_schema = os.environ.get('DEFAULT_SCHEMA_NAME', 'public')
        
        try:
            # Set the target schema
            os.environ['DEFAULT_SCHEMA_NAME'] = schema_name
            logger.info(f"🔄 Applying {action} to schema '{schema_name}'...")
            
            # Build the alembic command
            cmd = ['alembic', action]
            if target:
                cmd.append(target)
            
            # Execute the migration
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                check=False
            )
            
            if result.returncode == 0:
                logger.info(f"✅ Successfully applied {action} to schema '{schema_name}'")
                if result.stdout.strip():
                    logger.info(f"Output: {result.stdout.strip()}")
                return True
            else:
                logger.error(f"❌ Failed to apply {action} to schema '{schema_name}'")
                logger.error(f"Error: {result.stderr}")
                if result.stdout.strip():
                    logger.error(f"Output: {result.stdout.strip()}")
                return False
                
        finally:
            # Restore original schema
            os.environ['DEFAULT_SCHEMA_NAME'] = original_schema
    
    def migrate_schemas(self, schemas: List[str], action: str, target: Optional[str] = None) -> dict:
        """Apply migrations to multiple schemas."""
        results = {}
        
        logger.info(f"🚀 Starting multi-schema migration: {action}")
        logger.info(f"Target schemas: {', '.join(schemas)}")
        if target:
            logger.info(f"Target revision: {target}")
        
        for schema in schemas:
            logger.info(f"\n📋 Processing schema: {schema}")
            
            # Verify/create schema
            if not self.verify_schema_exists(schema):
                if action in ['upgrade', 'current']:
                    logger.info(f"Creating missing schema: {schema}")
                    if not self.create_schema_if_not_exists(schema):
                        results[schema] = {'success': False, 'error': 'Failed to create schema'}
                        continue
                else:
                    results[schema] = {'success': False, 'error': 'Schema does not exist'}
                    continue
            
            # Get current state
            current = self.get_current_migration(schema)
            results[schema] = {
                'success': False,
                'current_before': current,
                'action': action,
                'target': target
            }
            
            # Apply migration
            if action == 'current':
                # Just show current state, no migration needed
                results[schema]['success'] = True
            else:
                success = self.apply_migration(schema, action, target)
                results[schema]['success'] = success
                
                if success:
                    # Get new current state
                    new_current = self.get_current_migration(schema)
                    results[schema]['current_after'] = new_current
        
        return results
    
    def print_summary(self, results: dict):
        """Print a summary of migration results."""
        logger.info("\n" + "="*60)
        logger.info("MIGRATION SUMMARY")
        logger.info("="*60)
        
        successful = []
        failed = []
        
        for schema, result in results.items():
            if result['success']:
                successful.append(schema)
                status = "✅ SUCCESS"
            else:
                failed.append(schema)
                status = "❌ FAILED"
            
            logger.info(f"{status} - Schema: {schema}")
            if 'current_before' in result:
                logger.info(f"  Before: {result.get('current_before', 'None')}")
            if 'current_after' in result:
                logger.info(f"  After:  {result.get('current_after', 'None')}")
            if 'error' in result:
                logger.info(f"  Error:  {result['error']}")
        
        logger.info(f"\n📊 TOTAL: {len(successful)} successful, {len(failed)} failed")
        
        if failed:
            logger.error(f"⚠️  Failed schemas: {', '.join(failed)}")
            return False
        else:
            logger.info("🎉 All migrations completed successfully!")
            return True


def main():
    parser = argparse.ArgumentParser(
        description="Apply Alembic migrations to multiple PostgreSQL schemas"
    )
    parser.add_argument(
        '--schemas',
        required=True,
        help='Comma-separated list of schemas to migrate (e.g., dev,prod)'
    )
    parser.add_argument(
        '--action',
        choices=['upgrade', 'downgrade', 'current', 'rollback'],
        default='upgrade',
        help='Migration action to perform'
    )
    parser.add_argument(
        '--target',
        help='Target revision for upgrade/downgrade (defaults to head for upgrade)'
    )
    parser.add_argument(
        '--database-url',
        help='Database URL (defaults to current settings)'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Show what would be done without making changes'
    )
    
    args = parser.parse_args()
    
    # Parse schemas
    schemas = [s.strip() for s in args.schemas.split(',')]
    
    # Determine database URL
    database_url = args.database_url or settings.database_url
    
    # Map action aliases
    action = args.action
    if action == 'rollback':
        if not args.target:
            logger.error("❌ Rollback requires --target argument")
            sys.exit(1)
        action = 'downgrade'
    
    # Set default target for upgrade
    target = args.target
    if action == 'upgrade' and not target:
        target = 'head'
    
    if args.dry_run:
        logger.info("🔍 DRY RUN MODE - No changes will be made")
        logger.info(f"Would apply '{action}' to schemas: {', '.join(schemas)}")
        if target:
            logger.info(f"Target: {target}")
        sys.exit(0)
    
    # Perform migrations
    migrator = MultiSchemaMigrator(database_url)
    results = migrator.migrate_schemas(schemas, action, target)
    success = migrator.print_summary(results)
    
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()