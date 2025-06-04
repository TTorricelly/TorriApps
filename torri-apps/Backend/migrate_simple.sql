-- Simple migration script for single schema architecture
-- Target: Copy public tables to tenant_beauty_hub and update constraints

-- Step 1: Copy tenants table from public schema (skip if already exists)
CREATE TABLE IF NOT EXISTS tenant_beauty_hub.tenants LIKE torri_app_public.tenants;
INSERT IGNORE INTO tenant_beauty_hub.tenants SELECT * FROM torri_app_public.tenants;

-- Step 2: Copy admin_master_users table from public schema (skip if already exists)
CREATE TABLE IF NOT EXISTS tenant_beauty_hub.admin_master_users LIKE torri_app_public.admin_master_users;
INSERT IGNORE INTO tenant_beauty_hub.admin_master_users SELECT * FROM torri_app_public.admin_master_users;

-- Step 3: Make tenant_id optional and update constraints
ALTER TABLE tenant_beauty_hub.users_tenant MODIFY COLUMN tenant_id CHAR(36) NULL;
ALTER TABLE tenant_beauty_hub.service_categories MODIFY COLUMN tenant_id CHAR(36) NULL;
ALTER TABLE tenant_beauty_hub.services MODIFY COLUMN tenant_id CHAR(36) NULL;
ALTER TABLE tenant_beauty_hub.tenants MODIFY COLUMN db_schema_name VARCHAR(100) NULL;

-- Note: Unique constraints will be handled by the application layer
-- This avoids complex constraint migration issues

-- Verification
SELECT 'tenants' as table_name, COUNT(*) as count FROM tenant_beauty_hub.tenants
UNION ALL
SELECT 'admin_master_users', COUNT(*) FROM tenant_beauty_hub.admin_master_users  
UNION ALL
SELECT 'users_tenant', COUNT(*) FROM tenant_beauty_hub.users_tenant
UNION ALL
SELECT 'service_categories', COUNT(*) FROM tenant_beauty_hub.service_categories
UNION ALL
SELECT 'services', COUNT(*) FROM tenant_beauty_hub.services;