import os
import uuid
from typing import Optional
from fastapi import UploadFile, HTTPException
from pathlib import Path

# Allowed image extensions and MIME types
ALLOWED_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.svg'}
ALLOWED_MIME_TYPES = {'image/png', 'image/jpeg', 'image/svg+xml'}
MAX_FILE_SIZE = 2 * 1024 * 1024  # 2MB

class FileHandler:
    def __init__(self, base_upload_dir: str = "public/uploads"):
        self.base_upload_dir = Path(base_upload_dir)
        self.base_upload_dir.mkdir(parents=True, exist_ok=True)
    
    def validate_image_file(self, file: UploadFile) -> None:
        """Validate uploaded image file."""
        if not file.filename:
            raise HTTPException(status_code=400, detail="No file provided")
        
        # Check file extension
        file_ext = Path(file.filename).suffix.lower()
        if file_ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid file format. Allowed formats: {', '.join(ALLOWED_EXTENSIONS)}"
            )
        
        # Check MIME type
        if file.content_type not in ALLOWED_MIME_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type. Allowed types: {', '.join(ALLOWED_MIME_TYPES)}"
            )
    
    def generate_unique_filename(self, original_filename: str) -> str:
        """Generate a unique filename while preserving the extension."""
        file_ext = Path(original_filename).suffix.lower()
        unique_name = f"{uuid.uuid4()}{file_ext}"
        return unique_name
    
    def get_tenant_upload_dir(self, tenant_id: str, subdirectory: str = "icons") -> Path:
        """Get the upload directory for a specific tenant."""
        tenant_dir = self.base_upload_dir / tenant_id / subdirectory
        tenant_dir.mkdir(parents=True, exist_ok=True)
        return tenant_dir
    
    async def save_uploaded_file(
        self, 
        file: UploadFile, 
        tenant_id: str, 
        subdirectory: str = "icons"
    ) -> str:
        """
        Save uploaded file and return the relative path.
        
        Returns:
            str: Relative path to the saved file (e.g., "/uploads/tenant_id/icons/filename.png")
        """
        # Validate the file
        self.validate_image_file(file)
        
        # Check file size
        contents = await file.read()
        if len(contents) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size allowed: {MAX_FILE_SIZE // (1024*1024)}MB"
            )
        
        # Generate unique filename
        unique_filename = self.generate_unique_filename(file.filename)
        
        # Get tenant upload directory
        upload_dir = self.get_tenant_upload_dir(tenant_id, subdirectory)
        
        # Full file path
        file_path = upload_dir / unique_filename
        
        # Save file
        try:
            with open(file_path, "wb") as f:
                f.write(contents)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
        
        # Return relative path for storage in database
        relative_path = f"/uploads/{tenant_id}/{subdirectory}/{unique_filename}"
        return relative_path
    
    def delete_file(self, file_path: str) -> bool:
        """
        Delete a file given its relative path.
        
        Args:
            file_path: Relative path (e.g., "/uploads/tenant_id/icons/filename.png")
        
        Returns:
            bool: True if file was deleted, False if file didn't exist
        """
        if not file_path:
            return False
        
        # Remove leading slash and construct full path
        clean_path = file_path.lstrip("/")
        full_path = Path("public") / clean_path
        
        try:
            if full_path.exists():
                full_path.unlink()
                return True
            return False
        except Exception:
            return False
    
    def get_public_url(self, file_path: str, base_url: str) -> Optional[str]:
        """
        Convert a file path to a public URL.
        
        Args:
            file_path: Relative path (e.g., "/uploads/tenant_id/icons/filename.png")
            base_url: Base URL of the application (e.g., "https://api.example.com")
        
        Returns:
            str: Full public URL to the file
        """
        if not file_path:
            return None
        
        # Ensure the path starts with a slash
        if not file_path.startswith("/"):
            file_path = "/" + file_path
        
        return f"{base_url.rstrip('/')}{file_path}"

# Global instance
file_handler = FileHandler()