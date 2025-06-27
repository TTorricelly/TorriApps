#!/bin/bash
# Export data from Supabase to Google Cloud SQL

# Supabase connection details
SUPABASE_HOST="db.yrcqkjvmjcijymxkermx.supabase.co"
SUPABASE_USER="postgres"
SUPABASE_PASSWORD="f9gNmWtSdMc0LVGe"
SUPABASE_DB="postgres"

# Export directory
EXPORT_DIR="./db_export"
mkdir -p $EXPORT_DIR

echo "🔄 Exporting Supabase database..."

# Export schema structure
echo "📋 Exporting schema structure..."
pg_dump -h $SUPABASE_HOST -U $SUPABASE_USER -d $SUPABASE_DB \
    --schema-only \
    --no-owner \
    --no-privileges \
    --schema=dev \
    --schema=prod \
    > $EXPORT_DIR/schema.sql

# Export data only
echo "📦 Exporting data..."
pg_dump -h $SUPABASE_HOST -U $SUPABASE_USER -d $SUPABASE_DB \
    --data-only \
    --no-owner \
    --no-privileges \
    --schema=dev \
    --schema=prod \
    > $EXPORT_DIR/data.sql

# Export complete database as backup
echo "💾 Creating complete backup..."
pg_dump -h $SUPABASE_HOST -U $SUPABASE_USER -d $SUPABASE_DB \
    --no-owner \
    --no-privileges \
    --schema=dev \
    --schema=prod \
    > $EXPORT_DIR/complete_backup.sql

echo "✅ Export completed! Files saved in $EXPORT_DIR/"
echo "📁 Files created:"
echo "   - schema.sql (database structure)"
echo "   - data.sql (data only)"
echo "   - complete_backup.sql (complete backup)"