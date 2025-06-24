-- Add group_id column to appointments table if it doesn't exist
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'appointments' 
       AND COLUMN_NAME = 'group_id') = 0,
    'ALTER TABLE appointments ADD COLUMN group_id CHAR(36) NULL',
    'SELECT "Column group_id already exists"'
));

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index for group_id if it doesn't exist
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'appointments' 
       AND INDEX_NAME = 'ix_appointments_group_id') = 0,
    'CREATE INDEX ix_appointments_group_id ON appointments(group_id)',
    'SELECT "Index ix_appointments_group_id already exists"'
));

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;