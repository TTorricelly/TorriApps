-- Migration script to move from multi-tenant to single schema architecture
-- Target: Move all tables to tenant_beauty_hub schema and update constraints

-- Step 1: Ensure target schema exists
CREATE SCHEMA IF NOT EXISTS tenant_beauty_hub;

-- Step 2: Copy tenants table structure and data from torri_app_public to tenant_beauty_hub
CREATE TABLE IF NOT EXISTS tenant_beauty_hub.tenants LIKE torri_app_public.tenants;
INSERT IGNORE INTO tenant_beauty_hub.tenants SELECT * FROM torri_app_public.tenants;

-- Step 3: Copy admin_master_users table structure and data from torri_app_public to tenant_beauty_hub
CREATE TABLE IF NOT EXISTS tenant_beauty_hub.admin_master_users LIKE torri_app_public.admin_master_users;
INSERT IGNORE INTO tenant_beauty_hub.admin_master_users SELECT * FROM torri_app_public.admin_master_users;

-- Step 4: Update constraints for single schema architecture

-- 4.1: Make tenant_id optional in existing tables (for legacy compatibility)
ALTER TABLE tenant_beauty_hub.users_tenant 
    MODIFY COLUMN tenant_id CHAR(36) NULL;

-- Drop existing constraints if they exist (ignore errors)
-- Note: MySQL doesn't support IF EXISTS for constraints, so we handle errors gracefully
SET @sql = CONCAT('ALTER TABLE tenant_beauty_hub.users_tenant DROP INDEX uq_user_tenant_email');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add new unique constraint for email
ALTER TABLE tenant_beauty_hub.users_tenant ADD UNIQUE KEY unique_email (email);

-- 4.2: Make tenant_id optional in service_categories and add global unique constraint
ALTER TABLE tenant_beauty_hub.service_categories 
    MODIFY COLUMN tenant_id CHAR(36) NULL;

-- Drop existing category constraint if it exists
SET @sql = CONCAT('ALTER TABLE tenant_beauty_hub.service_categories DROP INDEX uq_category_tenant_name');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add new unique constraint for category name
ALTER TABLE tenant_beauty_hub.service_categories ADD UNIQUE KEY unique_category_name (name);

-- 4.3: Make tenant_id optional in services and remove tenant-specific constraints
ALTER TABLE tenant_beauty_hub.services 
    MODIFY COLUMN tenant_id CHAR(36) NULL;

-- Drop existing service constraint if it exists
SET @sql = CONCAT('ALTER TABLE tenant_beauty_hub.services DROP INDEX uq_service_tenant_name');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4.4: Make db_schema_name optional in tenants table (no longer used)
ALTER TABLE tenant_beauty_hub.tenants 
    MODIFY COLUMN db_schema_name VARCHAR(100) NULL;

-- Step 5: Set default tenant_id for existing records (optional, for data consistency)
-- UPDATE tenant_beauty_hub.users_tenant SET tenant_id = 'legacy-tenant-id' WHERE tenant_id IS NULL;
-- UPDATE tenant_beauty_hub.service_categories SET tenant_id = 'legacy-tenant-id' WHERE tenant_id IS NULL;
-- UPDATE tenant_beauty_hub.services SET tenant_id = 'legacy-tenant-id' WHERE tenant_id IS NULL;

-- Verification queries to check data migration
-- SELECT COUNT(*) as tenant_count FROM tenant_beauty_hub.tenants;
-- SELECT COUNT(*) as admin_count FROM tenant_beauty_hub.admin_master_users;
-- SELECT COUNT(*) as users_count FROM tenant_beauty_hub.users_tenant;
-- SELECT COUNT(*) as services_count FROM tenant_beauty_hub.services;
-- SELECT COUNT(*) as categories_count FROM tenant_beauty_hub.service_categories;

-- Check for duplicate emails (should be 0 after migration)
-- SELECT email, COUNT(*) FROM tenant_beauty_hub.users_tenant GROUP BY email HAVING COUNT(*) > 1;

-- Check for duplicate category names (should be 0 after migration)
-- SELECT name, COUNT(*) FROM tenant_beauty_hub.service_categories GROUP BY name HAVING COUNT(*) > 1;

-- Optional: Drop tables from public schema after successful migration (CAUTION!)
-- DROP TABLE IF EXISTS torri_app_public.tenants;
-- DROP TABLE IF EXISTS torri_app_public.admin_master_users;