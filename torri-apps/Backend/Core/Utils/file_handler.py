import os
import uuid
from typing import Optional
from fastapi import UploadFile, HTTPException
from pathlib import Path
from google.cloud import storage
from google.cloud.exceptions import NotFound
import logging

logger = logging.getLogger(__name__)

# Allowed image extensions and MIME types
ALLOWED_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.svg'}
ALLOWED_MIME_TYPES = {'image/png', 'image/jpeg', 'image/svg+xml'}
MAX_FILE_SIZE = 2 * 1024 * 1024  # 2MB

class FileHandler:
    def __init__(self, base_upload_dir: str = "public/uploads", bucket_name: str = "torri-apps-uploads"):
        self.base_upload_dir = Path(base_upload_dir)
        self.bucket_name = bucket_name
        self.use_cloud_storage = os.getenv("USE_CLOUD_STORAGE", "false").lower() == "true"
        
        if self.use_cloud_storage:
            try:
                self.storage_client = storage.Client()
                self.bucket = self.storage_client.bucket(bucket_name)
                logger.info(f"Initialized Cloud Storage with bucket: {bucket_name}")
            except Exception as e:
                logger.warning(f"Failed to initialize Cloud Storage: {e}. Falling back to local storage.")
                self.use_cloud_storage = False
                self.base_upload_dir.mkdir(parents=True, exist_ok=True)
        else:
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
        if not file.filename:
            raise HTTPException(status_code=400, detail="No filename provided")
        unique_filename = self.generate_unique_filename(file.filename)
        
        # Create the relative path for storage
        relative_path = f"/uploads/{tenant_id}/{subdirectory}/{unique_filename}"
        
        if self.use_cloud_storage:
            # Save to Google Cloud Storage
            try:
                blob_name = f"{tenant_id}/{subdirectory}/{unique_filename}"
                blob = self.bucket.blob(blob_name)
                blob.upload_from_string(contents, content_type=file.content_type)
                logger.info(f"Uploaded file to Cloud Storage: {blob_name}")
            except Exception as e:
                logger.error(f"Failed to upload to Cloud Storage: {e}")
                raise HTTPException(status_code=500, detail=f"Failed to save file to cloud storage: {str(e)}")
        else:
            # Save to local filesystem (fallback)
            upload_dir = self.get_tenant_upload_dir(tenant_id, subdirectory)
            file_path = upload_dir / unique_filename
            
            try:
                with open(file_path, "wb") as f:
                    f.write(contents)
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
        
        return relative_path
    
    async def save_file_async(
        self, 
        file_data: bytes, 
        filename: str, 
        subdirectory: str = "icons",
        file_type: str = "application/octet-stream"
    ) -> str:
        """
        Save raw file data and return the relative path.
        Used for programmatically saving files (e.g., downloaded images).
        
        Args:
            file_data: Raw file bytes
            filename: Name of the file (should include extension)
            subdirectory: Subdirectory path (e.g., "users/123/profile")
            file_type: MIME type of the file
        
        Returns:
            str: Relative path to the saved file
        """
        # Validate file size
        if len(file_data) > MAX_FILE_SIZE:
            raise ValueError(f"File too large. Maximum size allowed: {MAX_FILE_SIZE // (1024*1024)}MB")
        
        # Create the relative path for storage
        relative_path = f"/uploads/{subdirectory}/{filename}"
        
        if self.use_cloud_storage:
            # Save to Google Cloud Storage
            try:
                blob_name = f"{subdirectory}/{filename}"
                blob = self.bucket.blob(blob_name)
                blob.upload_from_string(file_data, content_type=file_type)
                logger.info(f"Uploaded file to Cloud Storage: {blob_name}")
            except Exception as e:
                logger.error(f"Failed to upload to Cloud Storage: {e}")
                raise ValueError(f"Failed to save file to cloud storage: {str(e)}")
        else:
            # Save to local filesystem (fallback)
            upload_dir = Path(self.base_upload_dir) / subdirectory
            upload_dir.mkdir(parents=True, exist_ok=True)
            file_path = upload_dir / filename
            
            try:
                with open(file_path, "wb") as f:
                    f.write(file_data)
                logger.info(f"Saved file locally: {file_path}")
            except Exception as e:
                raise ValueError(f"Failed to save file: {str(e)}")
        
        return relative_path
    
    def get_file_url(self, file_path: str) -> str:
        """Get public URL for a file path"""
        if self.use_cloud_storage and file_path:
            # Extract blob name from relative path
            blob_name = file_path.lstrip("/").replace("uploads/", "", 1)
            return f"https://storage.googleapis.com/{self.bucket_name}/{blob_name}"
        else:
            return file_path  # Return relative path for local storage
    
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
        
        if self.use_cloud_storage:
            # Delete from Google Cloud Storage
            try:
                # Extract blob name from relative path
                # Convert "/uploads/tenant_id/icons/filename.png" to "tenant_id/icons/filename.png"
                blob_name = file_path.lstrip("/").replace("uploads/", "", 1)
                blob = self.bucket.blob(blob_name)
                blob.delete()
                logger.info(f"Deleted file from Cloud Storage: {blob_name}")
                return True
            except NotFound:
                return False
            except Exception as e:
                logger.error(f"Failed to delete from Cloud Storage: {e}")
                return False
        else:
            # Delete from local filesystem (fallback)
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
        
        if self.use_cloud_storage:
            # Return Google Cloud Storage public URL
            try:
                # Extract blob name from relative path
                blob_name = file_path.lstrip("/").replace("uploads/", "", 1)
                blob = self.bucket.blob(blob_name)
                # Generate a public URL (files must be publicly accessible)
                return f"https://storage.googleapis.com/{self.bucket_name}/{blob_name}"
            except Exception as e:
                logger.error(f"Failed to generate Cloud Storage URL: {e}")
                return None
        else:
            # Return local filesystem URL (fallback)
            if not file_path.startswith("/"):
                file_path = "/" + file_path
            
            return f"{base_url.rstrip('/')}{file_path}"

# Global instance
file_handler = FileHandler()