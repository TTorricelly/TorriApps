#!/usr/bin/env python3
"""
Tenant Migration CLI Entry Point

Usage:
    python tenant_cli.py create <schema_name>
    python tenant_cli.py upgrade-all
    python tenant_cli.py upgrade-public
    python tenant_cli.py list-tenants
    python tenant_cli.py status <schema_name>
"""

if __name__ == "__main__":
    from Core.TenantMigration.cli import cli
    cli()