# Selected Services Component Migration: ServicesPage

## Context

The ServicesPage.jsx component displays the user's selected services in a swipeable card format, allowing users to review their selections before scheduling. It currently uses the same `buildServiceImages()` function as HomePage to display service images in a carousel format.

This component needs to be updated to use the new dynamic service images while maintaining the swipe-to-remove functionality and service review capabilities.

## Goal

Update the ServicesPage component to use dynamic service images from the ServiceImage table while preserving all existing functionality including swipe gestures, service removal, price calculations, and the scheduling workflow integration.

## What Needs to Be Done

1. **Replace buildServiceImages Function**: Remove the inline `buildServiceImages()` function and import the new utility from `imageUtils.js`
2. **Update Image Carousel**: Modify the image display to work with new dynamic images
3. **Maintain Swipe Functionality**: Ensure swipe-to-remove gestures continue working properly
4. **Preserve Service Summary**: Keep price calculations and service count accurate
5. **Update Image Modal**: Ensure full-size image viewing works with new image structure
6. **Handle Service Updates**: Ensure real-time updates when services are modified in other parts of the app
7. **Maintain Scheduling Integration**: Keep the connection to WalkInModal and scheduling workflow intact

## Final Output

- Updated ServicesPage.jsx that uses new dynamic service images
- All swipe gestures and service management functionality preserved
- Proper integration with services store and state management
- Maintained scheduling workflow integration
- Improved image display with proper alt text and ordering

## Technical Details

1. **File Location**: `/App-client/src/pages/ServicesPage.jsx`

2. **Current Image Implementation**:
   ```javascript
   // Inline function in ServicesPage.jsx (similar to HomePage)
   const buildServiceImages = (service) => {
     const images = [];
     if (service?.image) {
       images.push({ src: getFullImageUrl(service.image), caption: "Imagem do Serviço" });
     }
     // ... static field mapping for hair types
     return images;
   };
   
   // Used in service card rendering
   const serviceImages = buildServiceImages(serviceData);
   ```

3. **New Implementation Approach**:
   ```javascript
   // Import new utilities
   import { buildServiceImages, getPrimaryServiceImage } from '../utils/imageUtils';
   
   // Use in component render
   const serviceImages = buildServiceImages(serviceData);
   ```

4. **Key Component Areas to Update**:
   - **Service Cards**: Swipeable cards showing service details and images
   - **Image Carousel**: Horizontal scrollable images within each service card
   - **Service Summary**: Total price and duration calculations
   - **Image Modal**: Full-size image display functionality
   - **Empty State**: Display when no services are selected

5. **State Management Integration**:
   ```javascript
   // Current store integration
   const { selectedServices } = useServicesStore();
   
   // May need to handle image loading states
   const [serviceImages, setServiceImages] = useState({});
   ```

6. **Swipe Gesture Handling**:
   - Ensure swipe gestures work correctly with new image structure
   - Maintain haptic feedback on service removal
   - Keep smooth animations during swipe actions
   - Handle conflicts between image carousel scroll and card swipe

7. **Service Data Flow**:
   ```javascript
   // Current flow: selectedServices -> serviceData lookup -> buildServiceImages
   // New flow: selectedServices -> serviceData with images[] -> buildServiceImages
   ```

## Implementation Requirements

1. **Functionality Preservation**:
   - Swipe-to-remove service cards
   - Image carousel within each service card
   - Full-size image modal on image tap
   - Service count and price calculations
   - Navigation to scheduling (WalkInModal)

2. **Performance Optimization**:
   - Lazy load images for services not currently visible
   - Efficient re-rendering when services change
   - Smooth swipe animations without image loading delays
   - Memory management for services with many images

3. **Error Handling**:
   - Handle services that may have been deleted or modified
   - Graceful fallback for broken or missing images
   - Network error handling during image loads
   - State synchronization issues between store and API

4. **User Experience**:
   - Maintain consistent image display with HomePage
   - Fast and responsive swipe gestures
   - Clear visual feedback for service removal
   - Proper loading states for image-heavy services

## Specific Code Sections

1. **Image Processing** (around line 30-60):
   ```javascript
   // Remove inline buildServiceImages function
   // Add import for new image utilities
   ```

2. **Service Card Rendering** (around line 100-150):
   ```javascript
   // Update image carousel implementation
   // Handle new image structure in JSX
   ```

3. **Image Modal** (around line 200-250):
   ```javascript
   // Update modal to work with new image objects
   // Handle alt text and image metadata
   ```

4. **Service Removal Logic** (around line 80-100):
   ```javascript
   // Ensure removal works correctly with new data structure
   ```

## Integration Points

1. **Services Store**: 
   - Ensure store provides services with complete image data
   - Handle store updates when services are modified
   - Maintain backward compatibility during migration

2. **WalkInModal Integration**:
   - Ensure selected services data structure remains compatible
   - Pass correct service information to scheduling workflow
   - Maintain service validation logic

3. **Navigation**:
   - Keep navigation between ServicesPage and other components working
   - Maintain deep linking and state restoration

## Testing Strategy

1. **Core Functionality**:
   - Select services in HomePage → verify they appear correctly in ServicesPage
   - Swipe to remove services → verify removal and price recalculation
   - Tap images → verify modal opens with correct image
   - Navigate to scheduling → verify service data is passed correctly

2. **Edge Cases**:
   - Services with no images
   - Services with many images (performance)
   - Network errors during image loading
   - Services removed/modified while in cart

3. **User Flows**:
   - Complete service selection and scheduling workflow
   - Multiple service types with different image counts
   - Service removal and re-addition
   - App backgrounding/foregrounding with selected services

4. **Performance**:
   - Smooth scrolling with multiple service cards
   - Memory usage with image-heavy services
   - Swipe gesture responsiveness