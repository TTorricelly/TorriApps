from passlib.context import CryptContext

# It's good practice to define the context once per application.
# Schemes like bcrypt, scrypt, pbkdf2_sha256 are recommended.
# "auto" will use the first scheme for hashing and support all for verification.
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against a hashed password."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hashes a plain password."""
    return pwd_context.hash(password)
