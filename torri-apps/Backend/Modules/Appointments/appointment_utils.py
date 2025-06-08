from datetime import date, time, datetime, timedelta
from uuid import UUID

from sqlalchemy.orm import Session
from fastapi import HTTPException, status

# from Modules.Tenants.models import Tenant # Tenant model removed


def calculate_end_time(start_time: time, duration_minutes: int) -> time:
    """Calculates the end time given a start time and duration in minutes."""
    # Combine date and time for timedelta arithmetic, then extract time
    # Using a dummy date as only time arithmetic is needed.
    dummy_date = date(2000, 1, 1)
    start_datetime = datetime.combine(dummy_date, start_time)
    end_datetime = start_datetime + timedelta(minutes=duration_minutes)
    return end_datetime.time()

# Function get_tenant_block_size removed as tenant concept is deprecated.
# Consumers of this function should use a default or alternative configuration for block size.