from datetime import date, time, datetime, timedelta
from uuid import UUID

from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from Modules.Tenants.models import Tenant


def calculate_end_time(start_time: time, duration_minutes: int) -> time:
    """Calculates the end time given a start time and duration in minutes."""
    # Combine date and time for timedelta arithmetic, then extract time
    # Using a dummy date as only time arithmetic is needed.
    dummy_date = date(2000, 1, 1)
    start_datetime = datetime.combine(dummy_date, start_time)
    end_datetime = start_datetime + timedelta(minutes=duration_minutes)
    return end_datetime.time()


def get_tenant_block_size(db: Session, tenant_id: UUID) -> int:
    """Fetches the tenant's block_size_minutes."""
    try:
        tenant = db.get(Tenant, str(tenant_id))  # Convert UUID to string for MySQL compatibility
        if not tenant:
            # Return default block size if tenant not found
            return 30
        return tenant.block_size_minutes
    except Exception:
        # Return default block size if there are model relationship issues
        return 30