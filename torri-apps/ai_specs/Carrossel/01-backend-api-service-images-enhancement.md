# Backend API Enhancement: Service Images Integration

## Context

The app-client currently uses old static image fields (image, image_liso, image_ondulado, image_cacheado, image_crespo) from the Service table to display service images. We have migrated to a new ServiceImage table that supports multiple images per service with proper metadata (is_primary, alt_text, display_order).

The backend already has the ServiceImage model and relationships implemented, but the services API endpoint used by the app-client may not be returning the images relationship properly.

## Goal

Ensure the backend services API endpoint returns services with their complete image relationships, properly ordered and accessible for the app-client.

## What Needs to Be Done

1. **Verify Services API Response**: Check if the services API endpoint used by app-client (`GET /api/v1/services?category_id=X`) includes the images relationship
2. **Update Service Query**: Ensure the service query includes `selectinload(Service.images)` to avoid N+1 queries
3. **Verify Image URL Construction**: Ensure image file_path fields contain proper URLs that the app-client can access
4. **Test API Response**: Verify the response structure includes:
   ```json
   {
     "id": "service-uuid",
     "name": "Service Name",
     "images": [
       {
         "id": "image-uuid",
         "file_path": "/api/v1/uploads/services/filename.jpg",
         "alt_text": "Image description",
         "is_primary": true,
         "display_order": 0
       }
     ]
   }
   ```

## Final Output

- Services API endpoint returns complete service data with images relationship
- Images are properly ordered by display_order
- Image URLs are accessible from the app-client
- No additional N+1 query issues when fetching services with images

## Technical Details

1. **File Location**: `/Backend/Modules/Services/routes.py` and `/Backend/Modules/Services/services.py`
2. **API Endpoint**: Likely `GET /api/v1/services` with category_id parameter
3. **Schema**: Should use `ServiceWithImagesResponse` or similar that includes images field
4. **Database Query**: Must include `selectinload(Service.images)` for efficient loading
5. **Image URLs**: The `file_path` should be a complete URL path that works with the frontend's `buildAssetUrl()` function
6. **Ordering**: Images should be ordered by `display_order` field (already configured in model relationship)
7. **Primary Images**: Ensure `is_primary` field is properly set and returned in API response

## Validation Steps

1. Test API endpoint: `GET /api/v1/services?category_id=<some-category-id>`
2. Verify response includes `images` array for each service
3. Verify images are ordered by `display_order`
4. Verify primary images are marked with `is_primary: true`
5. Test image URL accessibility from frontend domain