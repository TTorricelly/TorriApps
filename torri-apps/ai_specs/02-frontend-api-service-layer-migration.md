# Frontend API Service Layer Migration

## Context

The app-client currently uses a categoryService.js that fetches services using old static image fields. The service uses `transformEntityWithImages()` with `SERVICE_IMAGE_FIELDS` array to process static image fields (image, image_liso, image_ondulado, image_cacheado, image_crespo).

With the new ServiceImage table, services now include an `images` array with dynamic image objects instead of static fields.

## Goal

Update the frontend API service layer to work with the new service images relationship while maintaining backward compatibility during the transition period.

## What Needs to Be Done

1. **Update SERVICE_IMAGE_FIELDS**: Modify or replace the static field mapping to handle the new images array
2. **Create New Image Transformer**: Build a new transformation function that processes the `images` array from the API response
3. **Update getServicesByCategory**: Modify the API call to properly handle the new response structure
4. **Maintain Backward Compatibility**: Ensure the system still works if some services have old static images while others have new dynamic images
5. **Update Error Handling**: Ensure proper error handling for the new image structure

## Final Output

- Updated `/App-client/src/services/categoryService.js` that works with new service images
- New image transformation utility that converts service images array into the format expected by UI components
- Backward compatibility with services that still have old static image fields
- Proper error handling and fallbacks

## Technical Details

1. **File Locations**:
   - `/App-client/src/services/categoryService.js` - Main service API file
   - `/App-client/src/utils/apiHelpers.js` - May need updates to transformation utilities

2. **Current Implementation**:
   ```javascript
   const SERVICE_IMAGE_FIELDS = [
     'image_url', 'liso_image_url', 'ondulado_image_url', 
     'cacheado_image_url', 'crespo_image_url'
   ];
   
   export const getServicesByCategory = async (categoryId) => {
     return withApiErrorHandling(
       () => apiClient.get(endpoint, { params: { category_id: categoryId } }),
       {
         transformData: (data) => transformEntityWithImages(data, SERVICE_IMAGE_FIELDS)
       }
     );
   };
   ```

3. **New Structure Expected**:
   ```javascript
   // New service response includes:
   {
     id: "uuid",
     name: "Service Name", 
     images: [
       {
         id: "uuid",
         file_path: "/path/to/image.jpg",
         alt_text: "Description",
         is_primary: true,
         display_order: 0
       }
     ]
   }
   ```

4. **Transformation Requirements**:
   - Convert `images` array into format compatible with existing `buildServiceImages()` function
   - Handle services with both old static fields and new images array
   - Preserve image ordering based on `display_order`
   - Mark primary images appropriately
   - Handle missing or empty images gracefully

5. **Compatibility Strategy**:
   - Check if service has `images` array first
   - Fall back to static fields if no `images` array exists
   - Merge both sources if both exist (prioritize new images)

## Implementation Notes

1. **URL Processing**: New images may require different URL processing than static fields
2. **Performance**: Avoid processing images that won't be displayed
3. **Caching**: Consider how image data should be cached in the frontend
4. **Error States**: Handle cases where images fail to load or are missing