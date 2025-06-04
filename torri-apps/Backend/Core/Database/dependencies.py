from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from Config.Database import SessionLocal

def get_db() -> Session:
    """
    SIMPLIFIED: Single schema database dependency.
    No complex tenant switching logic needed anymore.
    """
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        print(f"Exception in database session: {e}")
        try:
            db.rollback()  # Rollback any pending changes
        except Exception as rollback_error:
            print(f"Error during rollback: {rollback_error}")
        raise  # Re-raise the original exception
    finally:
        try:
            db.close()
        except Exception as close_error:
            print(f"Error closing database session: {close_error}")

# Legacy alias for backward compatibility
def get_public_db() -> Session:
    """
    Legacy function - now points to same single schema.
    Kept for backward compatibility during migration.
    """
    return get_db()
