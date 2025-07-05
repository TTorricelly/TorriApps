#!/usr/bin/env python3
"""
Copy data from one schema to another
"""
import sys
from sqlalchemy import create_engine, text, MetaData, Table
from Config.Settings import settings

def copy_schema_data(source_schema, target_schema):
    """Copy all data from source schema to target schema"""
    engine = create_engine(settings.database_url)
    
    # Define table order to respect foreign key constraints
    table_order = [
        'labels',
        'service_categories', 
        'users',
        'services',
        'user_labels',
        'appointment_groups',
        'appointments',
        'professional_availability',
        'professional_blocked_time', 
        'professional_breaks',
        'service_images',
        'service_professionals_association',
        'service_image_labels'
    ]
    
    with engine.connect() as conn:
        print(f"Copying data from {source_schema} to {target_schema}...")
        
        for table_name in table_order:
            try:
                # Check if table exists in both schemas
                source_exists = conn.execute(text(f"""
                    SELECT EXISTS (
                        SELECT 1 FROM information_schema.tables 
                        WHERE table_schema = '{source_schema}' 
                        AND table_name = '{table_name}'
                    )
                """)).scalar()
                
                target_exists = conn.execute(text(f"""
                    SELECT EXISTS (
                        SELECT 1 FROM information_schema.tables 
                        WHERE table_schema = '{target_schema}' 
                        AND table_name = '{table_name}'
                    )
                """)).scalar()
                
                if not source_exists:
                    print(f"  Skipping {table_name} - doesn't exist in source schema")
                    continue
                    
                if not target_exists:
                    print(f"  Skipping {table_name} - doesn't exist in target schema")
                    continue
                
                # Get count of records in source
                count_result = conn.execute(text(f"SELECT COUNT(*) FROM {source_schema}.{table_name}"))
                count = count_result.scalar()
                
                if count == 0:
                    print(f"  Skipping {table_name} - no data in source")
                    continue
                
                # Get column names that exist in both schemas
                source_columns_result = conn.execute(text(f"""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_schema = '{source_schema}' 
                    AND table_name = '{table_name}'
                    ORDER BY ordinal_position
                """))
                source_columns = {row[0] for row in source_columns_result}
                
                target_columns_result = conn.execute(text(f"""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_schema = '{target_schema}' 
                    AND table_name = '{table_name}'
                    ORDER BY ordinal_position
                """))
                target_columns = {row[0] for row in target_columns_result}
                
                # Only use columns that exist in both schemas
                common_columns = list(source_columns.intersection(target_columns))
                columns_str = ', '.join(common_columns)
                
                # Handle special cases for enum casting
                if table_name == 'users':
                    # Cast enum types for users table
                    select_columns = []
                    for col in common_columns:
                        if col == 'role':
                            select_columns.append(f"role::text::{target_schema}.userrole")
                        elif col == 'gender':
                            select_columns.append(f"gender::text::{target_schema}.gender")
                        else:
                            select_columns.append(col)
                    select_str = ', '.join(select_columns)
                elif table_name == 'appointments':
                    # Cast enum types for appointments table
                    select_columns = []
                    for col in common_columns:
                        if col == 'status':
                            select_columns.append(f"status::text::{target_schema}.appointmentstatus")
                        else:
                            select_columns.append(col)
                    select_str = ', '.join(select_columns)
                elif table_name == 'appointment_groups':
                    # Cast enum types for appointment_groups table
                    select_columns = []
                    for col in common_columns:
                        if col == 'status':
                            select_columns.append(f"status::text::{target_schema}.appointmentgroupstatus")
                        else:
                            select_columns.append(col)
                    select_str = ', '.join(select_columns)
                elif table_name == 'professional_availability':
                    # Cast enum types for professional_availability table
                    select_columns = []
                    for col in common_columns:
                        if col == 'day_of_week':
                            select_columns.append(f"day_of_week::text::{target_schema}.dayofweek")
                        else:
                            select_columns.append(col)
                    select_str = ', '.join(select_columns)
                elif table_name == 'professional_breaks':
                    # Cast enum types for professional_breaks table
                    select_columns = []
                    for col in common_columns:
                        if col == 'day_of_week':
                            select_columns.append(f"day_of_week::text::{target_schema}.dayofweek")
                        else:
                            select_columns.append(col)
                    select_str = ', '.join(select_columns)
                else:
                    select_str = columns_str
                
                # Copy data with special filters for data quality
                if table_name == 'appointments':
                    # Filter out appointments with invalid time ranges
                    copy_query = f"""
                        INSERT INTO {target_schema}.{table_name} ({columns_str})
                        SELECT {select_str} FROM {source_schema}.{table_name}
                        WHERE start_time < end_time
                        ON CONFLICT DO NOTHING
                    """
                else:
                    copy_query = f"""
                        INSERT INTO {target_schema}.{table_name} ({columns_str})
                        SELECT {select_str} FROM {source_schema}.{table_name}
                        ON CONFLICT DO NOTHING
                    """
                
                result = conn.execute(text(copy_query))
                conn.commit()
                print(f"  ✓ Copied {count} records from {table_name}")
                
            except Exception as e:
                print(f"  ✗ Error copying {table_name}: {str(e)}")
                conn.rollback()
                continue
        
        print(f"\nData copy from {source_schema} to {target_schema} completed!")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python copy_schema_data_fixed.py <source_schema> <target_schema>")
        sys.exit(1)
    
    source_schema = sys.argv[1]
    target_schema = sys.argv[2]
    copy_schema_data(source_schema, target_schema)