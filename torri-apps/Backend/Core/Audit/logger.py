import logging
from logging.handlers import RotatingFileHandler # Example, can be other handlers
import json
from datetime import datetime, timezone # Use timezone aware UTC datetime
from typing import Optional, Dict, Any
from uuid import UUID
import enum # For AuditLogEvent enum

# Configurer um logger específico para auditoria
audit_logger = logging.getLogger("audit")
audit_logger.setLevel(logging.INFO) # Set level to INFO
audit_logger.propagate = False # Avoid logs propagating to the root logger

# Handler (ex: para arquivo, poderia ser para um serviço de log centralizado)
# TODO: Mover nome do arquivo e configurações para settings.py / env vars
# Ensure the log directory exists or has write permissions.
try:
    handler = RotatingFileHandler("audit.log", maxBytes=10*1024*1024, backupCount=5, encoding='utf-8')
    # Formato do log: apenas a mensagem JSON, já que o timestamp está no JSON.
    # Se quiser timestamp do logger também: '%(asctime)s - %(message)s'
    formatter = logging.Formatter('%(message)s')
    handler.setFormatter(formatter)
    audit_logger.addHandler(handler)
except Exception as e:
    # Fallback to basic logging if file handler fails (e.g. permission issues in some environments)
    logging.basicConfig(level=logging.ERROR)
    audit_logger = logging.getLogger("audit_fallback")
    audit_logger.error(f"Failed to initialize RotatingFileHandler for audit log: {e}. Audit logs will use basicConfig.")


class AuditLogEvent(str, enum.Enum):
    USER_LOGIN_SUCCESS = "USER_LOGIN_SUCCESS"
    USER_LOGIN_FAILURE = "USER_LOGIN_FAILURE"

    APPOINTMENT_CREATED = "APPOINTMENT_CREATED"
    APPOINTMENT_RESCHEDULED = "APPOINTMENT_RESCHEDULED"
    APPOINTMENT_CANCELLED = "APPOINTMENT_CANCELLED"
    APPOINTMENT_COMPLETED = "APPOINTMENT_COMPLETED"
    APPOINTMENT_NOSHOW = "APPOINTMENT_NOSHOW" # Added from previous step

    TENANT_CREATED = "TENANT_CREATED" # Example for future use
    USER_CREATED = "USER_CREATED" # Example for UserTenant creation
    USER_ROLE_CHANGED = "USER_ROLE_CHANGED" # Example

    # Add more specific events as needed for other modules
    CATEGORY_CREATED = "CATEGORY_CREATED"
    CATEGORY_UPDATED = "CATEGORY_UPDATED"
    CATEGORY_DELETED = "CATEGORY_DELETED"

    SERVICE_CREATED = "SERVICE_CREATED"
    SERVICE_UPDATED = "SERVICE_UPDATED"
    SERVICE_DELETED = "SERVICE_DELETED"

    AVAILABILITY_SLOT_CREATED = "AVAILABILITY_SLOT_CREATED"
    AVAILABILITY_SLOT_DELETED = "AVAILABILITY_SLOT_DELETED"
    AVAILABILITY_BREAK_CREATED = "AVAILABILITY_BREAK_CREATED"
    AVAILABILITY_BREAK_DELETED = "AVAILABILITY_BREAK_DELETED"
    AVAILABILITY_BLOCKED_TIME_CREATED = "AVAILABILITY_BLOCKED_TIME_CREATED"
    AVAILABILITY_BLOCKED_TIME_DELETED = "AVAILABILITY_BLOCKED_TIME_DELETED"


def log_audit(
    event_type: AuditLogEvent,
    requesting_user_id: Optional[UUID] = None,
    requesting_user_email: Optional[str] = None,
    tenant_id: Optional[UUID] = None,
    entity_id: Optional[UUID | str] = None, # Allow string for non-UUID entity IDs if any
    details: Optional[Dict[str, Any]] = None
):
    """
    Logs an audit event.
    Converts UUIDs to strings for JSON serialization.
    Timestamps are generated in UTC.
    """
    log_message = {
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "event_type": event_type.value,
        "requesting_user_id": str(requesting_user_id) if requesting_user_id else None,
        "requesting_user_email": requesting_user_email, # Email is already a string
        "tenant_id": str(tenant_id) if tenant_id else None,
        "entity_id": str(entity_id) if entity_id else None,
        "details": details if details else {}
    }
    try:
        audit_logger.info(json.dumps(log_message, ensure_ascii=False))
    except Exception as e:
        # Fallback if JSON serialization fails for some reason
        fallback_logger = logging.getLogger("audit_fallback_serialization")
        fallback_logger.error(f"Failed to serialize audit log message to JSON: {e}. Raw message: {log_message}", exc_info=True)
        audit_logger.info(str(log_message)) # Log as string if JSON fails
