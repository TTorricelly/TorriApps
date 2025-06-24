from datetime import datetime
import re

def get_current_timestamp():
    return datetime.utcnow()

def normalize_phone_number(phone: str) -> str:
    """
    Normalize phone number by removing all non-digit characters.
    
    Args:
        phone (str): Raw phone number that may contain spaces, dashes, parentheses, etc.
        
    Returns:
        str: Phone number with only digits
        
    Examples:
        normalize_phone_number("11 55557") -> "1155557"
        normalize_phone_number("(11) 5555-7777") -> "115555777"
        normalize_phone_number("+55 11 5555-7777") -> "5511555577777"
    """
    if not phone:
        return ""
    
    # Remove all non-digit characters
    return re.sub(r'\D', '', phone)

