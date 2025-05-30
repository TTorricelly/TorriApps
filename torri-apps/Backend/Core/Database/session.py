from sqlalchemy.orm import Session
from ...Config.Database import SessionLocal

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

