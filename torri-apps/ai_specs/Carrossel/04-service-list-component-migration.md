# Service List Component Migration: HomePage

## Context

The HomePage.jsx component is the main service browsing interface where clients can view and select services. It currently uses the old `buildServiceImages()` function to create image arrays from static service fields and displays them in a horizontal scrollable carousel.

The component needs to be updated to use the new dynamic service images from the ServiceImage table while maintaining the same user experience and functionality.

## Goal

Update the HomePage component to use dynamic service images while preserving all existing functionality including service selection, image carousels, expandable service cards, and responsive design.

## What Needs to Be Done

1. **Replace buildServiceImages Function**: Remove the inline `buildServiceImages()` function and import the new utility from `imageUtils.js`
2. **Update Image Display Logic**: Modify how images are processed and displayed in the service cards
3. **Maintain Service Selection**: Ensure service selection/deselection functionality continues to work
4. **Preserve Image Modal**: Keep the full-size image modal functionality working with new image structure
5. **Handle Loading States**: Add proper loading states for services with many images
6. **Update Image Error Handling**: Handle cases where images fail to load or are missing
7. **Test Responsive Design**: Ensure image carousels work properly on different screen sizes

## Final Output

- Updated HomePage.jsx that uses new dynamic service images
- Maintained all existing functionality (service selection, expandable cards, image modals)
- Proper error handling for missing or broken images
- Improved loading states for image-heavy services
- Full backward compatibility during transition period

## Technical Details

1. **File Location**: `/App-client/src/pages/HomePage.jsx`

2. **Current Image Implementation**:
   ```javascript
   // Inline function in HomePage.jsx (around line 45)
   const buildServiceImages = (service) => {
     const images = [];
     if (service?.image) {
       images.push({ src: getFullImageUrl(service.image), caption: "Imagem do Serviço" });
     }
     // ... static field mapping
     return images;
   };
   
   // Used in component render (around line 200)
   const serviceImages = buildServiceImages(service);
   ```

3. **New Implementation Approach**:
   ```javascript
   // Import new utility
   import { buildServiceImages, getPrimaryServiceImage } from '../utils/imageUtils';
   
   // Use in component
   const serviceImages = buildServiceImages(service);
   const primaryImage = getPrimaryServiceImage(service); // For collapsed view
   ```

4. **Key Component Areas to Update**:
   - **Service Card Header**: May show primary image in collapsed state
   - **Image Carousel**: Horizontal scrollable image list in expanded state
   - **Image Modal**: Full-size image display on click
   - **Loading States**: Show placeholders while images load
   - **Error States**: Show fallback when images fail to load

5. **UI/UX Considerations**:
   - **Image Count Display**: Show "X fotos" indicator based on actual image count
   - **Primary Image Highlight**: Consider highlighting primary images in carousel
   - **Image Quality**: Ensure new images maintain good display quality
   - **Performance**: Lazy load images that are not immediately visible

6. **State Management**:
   ```javascript
   // May need new state for image loading
   const [imageLoadingStates, setImageLoadingStates] = useState({});
   const [imageErrors, setImageErrors] = useState({});
   ```

7. **Specific Code Sections to Modify**:
   - Line ~45: Remove inline `buildServiceImages` function
   - Line ~1: Add import for new image utilities
   - Line ~200: Update image processing logic
   - Line ~220: Update image carousel rendering
   - Line ~250: Update image modal implementation

## Implementation Requirements

1. **Backward Compatibility**: Handle services with both old and new image systems
2. **Performance**: 
   - Don't load all images at once for services with many images
   - Implement lazy loading for images in carousel
   - Consider image preloading for primary images

3. **Error Handling**:
   - Graceful fallback when images fail to load
   - Show placeholder images for services without images
   - Handle network errors properly

4. **Accessibility**:
   - Use proper alt text from service images
   - Maintain keyboard navigation for image carousel
   - Ensure screen reader compatibility

5. **User Experience**:
   - Maintain smooth scrolling in image carousel
   - Keep image modal responsive and fast
   - Show loading indicators for slow-loading images

## Testing Requirements

1. **Functional Testing**:
   - Service selection/deselection works correctly
   - Image carousel scrolls smoothly
   - Image modal opens and closes properly
   - Primary images display correctly

2. **Edge Case Testing**:
   - Services with no images
   - Services with only old static images
   - Services with many images (10+)
   - Network failures during image loading

3. **Performance Testing**:
   - Page load time with image-heavy services
   - Memory usage with many images loaded
   - Smooth scrolling performance

4. **Device Testing**:
   - Mobile responsiveness
   - Touch gestures for image carousel
   - Different screen sizes and orientations