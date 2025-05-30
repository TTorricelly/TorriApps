#!/bin/bash

# Database backup script
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/backups"

echo "Starting backup at $TIMESTAMP..."

# Backup database
pg_dump $DATABASE_URL > "$BACKUP_DIR/db_backup_$TIMESTAMP.sql"

# Remove old backups (keep last 7 days)
find $BACKUP_DIR -name "db_backup_*.sql" -mtime +7 -delete

echo "Backup completed: db_backup_$TIMESTAMP.sql"

