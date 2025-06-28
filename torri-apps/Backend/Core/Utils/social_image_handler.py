"""
Social Image Handler
Downloads and processes profile pictures from social providers
"""

import aiohttp
import os
from uuid import uuid4
from Core.Utils.file_handler import FileHandler
from PIL import Image
import io


class SocialImageHandler:
    def __init__(self):
        self.file_handler = FileHandler()
        self.max_size = (500, 500)  # Maximum image dimensions
        self.quality = 85  # JPEG quality

    async def download_and_upload_social_image(
        self, 
        image_url: str, 
        user_id: str, 
        provider: str
    ) -> str | None:
        """
        Download social profile image and upload to storage
        
        Args:
            image_url: URL of the profile image
            user_id: User's ID for organizing files
            provider: Social provider name (google, facebook)
            
        Returns:
            Path to uploaded image or None if failed
        """
        if not image_url:
            return None
            
        try:
            # Download image from social provider
            image_data = await self._download_image(image_url)
            if not image_data:
                return None
            
            # Process and optimize image
            processed_image = self._process_image(image_data)
            if not processed_image:
                return None
            
            # Generate filename
            file_extension = 'jpg'  # Always convert to JPEG for consistency
            filename = f"{uuid4()}.{file_extension}"
            
            # Upload to storage
            file_path = await self.file_handler.save_file_async(
                file_data=processed_image,
                filename=filename,
                subdirectory=f"users/{user_id}/profile",
                file_type="image/jpeg"
            )
            
            return file_path
            
        except Exception as e:
            print(f"Failed to download and upload social image: {str(e)}")
            return None

    async def _download_image(self, image_url: str) -> bytes | None:
        """Download image from URL"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(image_url) as response:
                    if response.status == 200:
                        return await response.read()
                    return None
        except Exception as e:
            print(f"Failed to download image from {image_url}: {str(e)}")
            return None

    def _process_image(self, image_data: bytes) -> bytes | None:
        """Process and optimize image"""
        try:
            # Open image with PIL
            image = Image.open(io.BytesIO(image_data))
            
            # Convert to RGB if necessary (removes alpha channel)
            if image.mode in ('RGBA', 'LA', 'P'):
                # Create white background
                background = Image.new('RGB', image.size, (255, 255, 255))
                if image.mode == 'P':
                    image = image.convert('RGBA')
                background.paste(image, mask=image.split()[-1] if image.mode == 'RGBA' else None)
                image = background
            
            # Resize if necessary while maintaining aspect ratio
            image.thumbnail(self.max_size, Image.Resampling.LANCZOS)
            
            # Save as JPEG
            output = io.BytesIO()
            image.save(output, format='JPEG', quality=self.quality, optimize=True)
            output.seek(0)
            
            return output.getvalue()
            
        except Exception as e:
            print(f"Failed to process image: {str(e)}")
            return None

    def get_profile_image_url(self, file_path: str) -> str:
        """Get public URL for profile image"""
        return self.file_handler.get_file_url(file_path)