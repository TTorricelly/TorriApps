from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from Core.Auth.models import User # Adjusted import path
# Schemas will be used for type hinting and response models, but UserCreate is not directly used here
# from Core.Auth.Schemas import UserCreate
from Core.Security.hashing import verify_password
from Core.Utils.Helpers import normalize_phone_number
from Core.Security.hashing import get_password_hash
from Core.Auth.constants import UserRole, Gender, HairType
from Core.Auth.Schemas import SocialUserProfile
# create_access_token is used in routes, not directly in this service function for authentication logic
# from Core.Security.jwt import create_access_token
# HTTPException is typically raised in routes, services usually return data or None/False
# from fastapi import HTTPException
# Removed audit logging imports
# Removed Tenant import as it's no longer needed
# from Modules.Tenants.models import Tenant
# Removed settings import as it's no longer needed for default_schema_name
# from Config.Settings import settings
import re
import aiohttp
import json
from google.auth.transport import requests
from google.oauth2 import id_token
from datetime import datetime
from uuid import uuid4
from Core.Utils.social_image_handler import SocialImageHandler


def authenticate_user(db: Session, email_or_phone: str, password: str) -> tuple[User | None, str | None]:
    """
    Authenticates a user by email or phone number and password.
    All users are in the same schema.
    
    Args:
        db: SQLAlchemy database session.
        email_or_phone: User's email or phone number.
        password: User's plain text password.
    
    Returns:
        Tuple of (User object or None, error_message or None)
        - Success: (User, None)
        - Failure: (None, error_message)
    """
    try:
        # Determine if input is email or phone
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        is_email = re.match(email_pattern, email_or_phone)
        
        # Query by email or phone number
        if is_email:
            user = db.query(User).filter(
                User.email == email_or_phone,
                User.is_active == True
            ).first()
        else:
            # Normalize the input phone number (remove all non-digit characters)
            normalized_input_phone = normalize_phone_number(email_or_phone)
            
            # Query users and normalize their phone numbers for comparison
            # We need to find users where the normalized phone number matches
            users = db.query(User).filter(
                User.phone_number.isnot(None),
                User.is_active == True
            ).all()
            
            # Find matching user by comparing normalized phone numbers
            user = None
            for u in users:
                if normalize_phone_number(u.phone_number) == normalized_input_phone:
                    user = u
                    break
        
        if not user:
            return None, "Email or phone number not found."
        
        # Verify password
        if not verify_password(password, user.hashed_password):
            return None, "Incorrect password."
        
        # Success
        return user, None
        
    except Exception as e:
        return None, f"Authentication error: {str(e)}"

# Social Authentication Functions

async def verify_google_token(id_token_str: str, access_token: str) -> SocialUserProfile:
    """
    Verify Google ID token and extract user information
    """
    try:
        # Verify the ID token
        idinfo = id_token.verify_oauth2_token(
            id_token_str, 
            requests.Request(),
            # Add your Google Client ID here or from settings
            audience="YOUR_GOOGLE_CLIENT_ID"
        )
        
        # Extract user information
        user_profile = SocialUserProfile(
            id=idinfo['sub'],
            email=idinfo['email'],
            name=idinfo.get('name', ''),
            picture=idinfo.get('picture'),
            provider='google'
        )
        
        return user_profile
        
    except ValueError:
        raise ValueError("Invalid Google token")

async def verify_facebook_token(access_token: str, user_id: str) -> SocialUserProfile:
    """
    Verify Facebook access token and get user information
    """
    try:
        # Verify token and get user info from Facebook API
        async with aiohttp.ClientSession() as session:
            # First, verify the token
            verify_url = f"https://graph.facebook.com/debug_token"
            verify_params = {
                'input_token': access_token,
                'access_token': f"YOUR_FACEBOOK_APP_ID|YOUR_FACEBOOK_APP_SECRET"
            }
            
            async with session.get(verify_url, params=verify_params) as response:
                verify_data = await response.json()
                if not verify_data.get('data', {}).get('is_valid'):
                    raise ValueError("Invalid Facebook token")
            
            # Get user information
            user_url = f"https://graph.facebook.com/v18.0/{user_id}"
            user_params = {
                'fields': 'id,name,email,picture.type(large),birthday,gender',
                'access_token': access_token
            }
            
            async with session.get(user_url, params=user_params) as response:
                user_data = await response.json()
                
                if 'error' in user_data:
                    raise ValueError(f"Facebook API error: {user_data['error']['message']}")
                
                user_profile = SocialUserProfile(
                    id=user_data['id'],
                    email=user_data.get('email', ''),
                    name=user_data.get('name', ''),
                    picture=user_data.get('picture', {}).get('data', {}).get('url'),
                    birthday=user_data.get('birthday'),
                    gender=user_data.get('gender'),
                    provider='facebook'
                )
                
                return user_profile
                
    except Exception as e:
        raise ValueError(f"Facebook token verification failed: {str(e)}")

async def find_or_create_social_user(
    db: Session, 
    user_profile: SocialUserProfile, 
    provider: str
) -> tuple[User, bool]:
    """
    Find existing user or create new user from social profile
    Returns (User, is_new_user)
    """
    try:
        # First check if user exists by social_id and provider
        existing_user = db.query(User).filter(
            User.social_id == user_profile.id,
            User.social_provider == provider,
            User.is_active == True
        ).first()
        
        if existing_user:
            return existing_user, False
        
        # Check if user exists by email
        existing_user_by_email = db.query(User).filter(
            User.email == user_profile.email,
            User.is_active == True
        ).first()
        
        if existing_user_by_email:
            # Update existing user with social login info
            existing_user_by_email.social_provider = provider
            existing_user_by_email.social_id = user_profile.id
            existing_user_by_email.profile_picture_url = user_profile.picture
            db.commit()
            db.refresh(existing_user_by_email)
            return existing_user_by_email, False
        
        # Create new user
        user_uuid = str(uuid4())
        new_user = User(
            id=user_uuid,
            email=user_profile.email,
            full_name=user_profile.name,
            hashed_password=get_password_hash(f"social_login_{user_profile.id}"),  # Random password
            role=UserRole.CLIENTE,  # Default role for social users
            social_provider=provider,
            social_id=user_profile.id,
            profile_picture_url=user_profile.picture,
            is_active=True
        )
        
        # Parse additional fields if available
        if user_profile.birthday:
            try:
                # Facebook birthday format: MM/DD/YYYY
                birthday_date = datetime.strptime(user_profile.birthday, "%m/%d/%Y").date()
                new_user.date_of_birth = birthday_date
            except ValueError:
                pass  # Skip if birthday format is unexpected
        
        if user_profile.gender:
            try:
                # Map social gender to our enum
                gender_mapping = {
                    'male': Gender.MASCULINO,
                    'female': Gender.FEMININO
                }
                new_user.gender = gender_mapping.get(user_profile.gender.lower())
            except (AttributeError, KeyError):
                pass  # Skip if gender mapping fails
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        # Download and upload profile picture if available
        if user_profile.picture:
            try:
                image_handler = SocialImageHandler()
                uploaded_image_path = await image_handler.download_and_upload_social_image(
                    user_profile.picture,
                    user_uuid,
                    provider
                )
                
                if uploaded_image_path:
                    # Update user with uploaded image path
                    new_user.photo_path = uploaded_image_path
                    db.commit()
                    db.refresh(new_user)
                    
            except Exception as e:
                # Don't fail user creation if image upload fails
                print(f"Failed to upload profile picture for user {user_uuid}: {str(e)}")
        
        return new_user, True
        
    except Exception as e:
        db.rollback()
        raise ValueError(f"Failed to create social user: {str(e)}")

# (Opcional, para depois) Criar função `create_user(db: Session, user: UserCreate) -> User`:
# *   Esta função será mais apropriada no `Modules/Users/services.py`. Por enquanto, o foco do `Auth/services.py` é autenticação.
