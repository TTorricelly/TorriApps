#!/usr/bin/env python3
"""
Migration helper script for multi-schema support.
Provides easy commands to manage migrations across different schemas.
"""

import os
import sys
import subprocess
import argparse
from typing import Optional

def run_alembic_command(command: str, schema: str, message: Optional[str] = None):
    """Run alembic command with schema specification."""
    cmd = ["alembic", "-x", f"schema={schema}"]
    cmd.extend(command.split())
    
    if message:
        cmd.extend(["-m", message])
    
    print(f"Running: {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=False)
    return result.returncode == 0

def reset_schema(schema: str):
    """Reset a schema by dropping and recreating it."""
    print(f"Resetting schema: {schema}")
    
    # Import here to avoid circular imports
    from sqlalchemy import create_engine, text
    from Config.Settings import settings
    
    engine = create_engine(settings.database_url)
    with engine.connect() as conn:
        # Drop schema if exists
        conn.execute(text(f"DROP SCHEMA IF EXISTS {schema} CASCADE"))
        conn.commit()
        
        # Create schema
        conn.execute(text(f"CREATE SCHEMA {schema}"))
        conn.commit()
        
        print(f"Schema {schema} reset successfully")

def main():
    parser = argparse.ArgumentParser(description="Multi-schema migration helper")
    parser.add_argument("action", choices=[
        "upgrade", "downgrade", "revision", "history", "current", "reset"
    ], help="Migration action")
    parser.add_argument("--schema", "-s", default="dev", 
                       help="Schema name (default: dev)")
    parser.add_argument("--message", "-m", 
                       help="Migration message (for revision)")
    parser.add_argument("--target", "-t", default="head",
                       help="Target revision (for upgrade/downgrade)")
    
    args = parser.parse_args()
    
    # Set environment variable for schema
    os.environ['ALEMBIC_SCHEMA'] = args.schema
    
    if args.action == "reset":
        # Reset schema and run fresh migration
        reset_schema(args.schema)
        print(f"Running initial migration on fresh schema: {args.schema}")
        success = run_alembic_command("upgrade head", args.schema)
        if success:
            print(f"Schema {args.schema} reset and migrated successfully!")
        else:
            print(f"Error during migration to {args.schema}")
            sys.exit(1)
    
    elif args.action == "revision":
        if not args.message:
            print("Error: --message is required for revision")
            sys.exit(1)
        success = run_alembic_command("revision --autogenerate", args.schema, args.message)
        if success:
            print(f"Revision created successfully for schema: {args.schema}")
        else:
            print(f"Error creating revision for schema: {args.schema}")
            sys.exit(1)
    
    elif args.action == "upgrade":
        success = run_alembic_command(f"upgrade {args.target}", args.schema)
        if success:
            print(f"Upgrade completed successfully for schema: {args.schema}")
        else:
            print(f"Error during upgrade for schema: {args.schema}")
            sys.exit(1)
    
    elif args.action == "downgrade":
        success = run_alembic_command(f"downgrade {args.target}", args.schema)
        if success:
            print(f"Downgrade completed successfully for schema: {args.schema}")
        else:
            print(f"Error during downgrade for schema: {args.schema}")
            sys.exit(1)
    
    elif args.action == "history":
        run_alembic_command("history", args.schema)
    
    elif args.action == "current":
        run_alembic_command("current", args.schema)

if __name__ == "__main__":
    main()