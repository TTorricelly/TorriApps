# Image Utility Migration: Dynamic Service Images

## Context

The app-client currently uses a `buildServiceImages()` function that creates an image array from static service fields (image, image_liso, image_ondulado, image_cacheado, image_crespo) with hardcoded captions like "Liso", "Ondulado", etc.

With the new ServiceImage table, we need to create a new image utility that:
- Works with dynamic service images from the `images` array
- Uses proper alt_text from the database instead of hardcoded captions
- Respects display_order for image sequencing
- Handles primary image prioritization

## Goal

Create a new image utility system that processes dynamic service images while maintaining the same interface expected by the UI components (HomePage and ServicesPage).

## What Needs to Be Done

1. **Create New buildServiceImages Function**: Replace the current static field mapping with dynamic image processing
2. **Handle Primary Image Logic**: Ensure primary images are displayed first or highlighted appropriately
3. **Image URL Processing**: Adapt URL building to work with the new file_path structure
4. **Maintain Interface Compatibility**: Keep the same return structure so existing UI components don't break
5. **Add Fallback Logic**: Handle cases where services have no images or both old and new image systems
6. **Create Image Filtering Utilities**: Add functions to get primary image, filter by type, etc.

## Final Output

- New image utility functions that work with dynamic service images
- Backward compatibility with existing UI components
- Proper primary image handling
- Efficient image URL processing
- Error handling for missing or invalid images

## Technical Details

1. **Current Implementation**:
   ```javascript
   // In HomePage.jsx and ServicesPage.jsx
   const buildServiceImages = (service) => {
     const images = [];
     if (service?.image) {
       images.push({ src: getFullImageUrl(service.image), caption: "Imagem do Serviço" });
     }
     if (service?.image_liso) {
       images.push({ src: getFullImageUrl(service.image_liso), caption: "Liso" });
     }
     // ... similar for other hair types
     return images;
   };
   ```

2. **New Expected Input**:
   ```javascript
   // Service object with new images array
   {
     id: "uuid",
     name: "Service Name",
     images: [
       {
         id: "uuid", 
         file_path: "/uploads/services/image.jpg",
         alt_text: "Beautiful hairstyle for curly hair",
         is_primary: true,
         display_order: 0
       }
     ]
   }
   ```

3. **Required Output Format**:
   ```javascript
   // Must maintain this structure for UI compatibility
   [
     {
       src: "full-url-to-image",
       caption: "alt_text or fallback caption"
     }
   ]
   ```

4. **File Locations to Update**:
   - Extract `buildServiceImages()` from HomePage.jsx and ServicesPage.jsx
   - Create new file: `/App-client/src/utils/imageUtils.js`
   - Import and use in both HomePage.jsx and ServicesPage.jsx

5. **Key Functions Needed**:
   ```javascript
   // Main function to replace current buildServiceImages
   export const buildServiceImages = (service) => { ... }
   
   // Get primary image only
   export const getPrimaryServiceImage = (service) => { ... }
   
   // Get all images ordered by display_order
   export const getOrderedServiceImages = (service) => { ... }
   
   // Fallback to static images if no dynamic images
   export const buildLegacyServiceImages = (service) => { ... }
   ```

6. **Image Processing Logic**:
   - Sort images by `display_order`
   - Use `alt_text` as caption, fallback to service name
   - Build full URLs using existing `getFullImageUrl()` function
   - Handle both relative and absolute file paths
   - Prioritize primary images when needed

## Implementation Requirements

1. **Performance**: Don't process images that won't be displayed
2. **Error Handling**: Gracefully handle missing images, invalid URLs, or malformed data
3. **Caching**: Consider memoization for expensive image processing
4. **Flexibility**: Support different image display modes (primary only, all images, etc.)
5. **Testing**: Ensure compatibility with existing image display components

## Migration Strategy

1. **Phase 1**: Create new utility functions alongside existing ones
2. **Phase 2**: Update HomePage.jsx to use new utilities
3. **Phase 3**: Update ServicesPage.jsx to use new utilities  
4. **Phase 4**: Remove old buildServiceImages functions from components
5. **Phase 5**: Clean up unused code and test thoroughly