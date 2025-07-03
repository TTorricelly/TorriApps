-- User Labels Association Migration Script
-- This script creates the user_labels association table for the many-to-many relationship between users and labels
-- Execute this script manually on your database

-- Create the user_labels association table
CREATE TABLE prod.user_labels (
    user_id UUID NOT NULL,
    label_id UUID NOT NULL,
    PRIMARY KEY (user_id, label_id),
    CONSTRAINT fk_user_labels_user_id FOREIGN KEY (user_id) REFERENCES prod.users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_labels_label_id FOREIGN KEY (label_id) REFERENCES prod.labels(id) ON DELETE CASCADE,
    CONSTRAINT uq_user_label UNIQUE (user_id, label_id)
);

-- Create indexes for better performance
CREATE INDEX idx_user_labels_user_id ON prod.user_labels(user_id);
CREATE INDEX idx_user_labels_label_id ON prod.user_labels(label_id);

-- Optional: Add a comment to the table
COMMENT ON TABLE dev.user_labels IS 'Association table for many-to-many relationship between users and labels';

-- Verify the table was created successfully
SELECT 
    table_name,
    table_type,
    table_schema
FROM information_schema.tables 
WHERE table_name = 'user_labels';

-- Check constraints
SELECT 
    constraint_name,
    constraint_type,
    table_name
FROM information_schema.table_constraints 
WHERE table_name = 'user_labels';

-- Check indexes
SELECT 
    indexname,
    tablename,
    indexdef
FROM pg_indexes 
WHERE tablename = 'user_labels';