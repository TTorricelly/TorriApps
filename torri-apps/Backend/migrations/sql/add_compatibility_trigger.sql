-- Function to ensure bidirectional compatibility consistency
-- Run this manually after running the Alembic migration

CREATE OR REPLACE FUNCTION ensure_bidirectional_compatibility()
RETURNS TRIGGER AS $$
BEGIN
    -- Prevent infinite loop by checking if we're already processing the reverse
    IF EXISTS (
        SELECT 1 FROM service_compatibility 
        WHERE service_a_id = NEW.service_b_id 
        AND service_b_id = NEW.service_a_id
        AND updated_at = NEW.updated_at
    ) THEN
        RETURN NEW;
    END IF;
    
    -- When inserting or updating compatibility A->B, also ensure B->A exists
    INSERT INTO service_compatibility (
        service_a_id, 
        service_b_id, 
        can_run_parallel, 
        parallel_type, 
        reason,
        notes
    )
    VALUES (
        NEW.service_b_id, 
        NEW.service_a_id, 
        NEW.can_run_parallel, 
        NEW.parallel_type, 
        NEW.reason,
        NEW.notes
    )
    ON CONFLICT (service_a_id, service_b_id) 
    DO UPDATE SET
        can_run_parallel = NEW.can_run_parallel,
        parallel_type = NEW.parallel_type,
        reason = NEW.reason,
        notes = NEW.notes,
        updated_at = CURRENT_TIMESTAMP;
        
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for bidirectional compatibility
DROP TRIGGER IF EXISTS trigger_bidirectional_compatibility ON service_compatibility;
CREATE TRIGGER trigger_bidirectional_compatibility
    AFTER INSERT OR UPDATE ON service_compatibility
    FOR EACH ROW
    EXECUTE FUNCTION ensure_bidirectional_compatibility();