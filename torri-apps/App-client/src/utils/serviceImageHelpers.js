/**
 * Service Image Helper utilities for handling both new images array and legacy static fields
 * Provides backward compatibility during the transition period
 */

import { buildAssetUrl } from './urlHelpers';

/**
 * Build service images array compatible with existing UI components
 * Handles both new images array structure and legacy static fields
 * @param {Object} service - Service object
 * @returns {Array} Array of image objects with src and caption
 */
export const buildServiceImages = (service) => {
  if (!service) return [];
  
  const images = [];
  
  // Priority 1: Use new images array if available
  if (service._processedImages && Array.isArray(service._processedImages)) {
    return service._processedImages;
  }
  
  // Priority 2: Use new images array directly if not processed yet
  if (service.images && Array.isArray(service.images)) {
    // Sort by display_order and convert to UI format
    const sortedImages = [...service.images].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    
    return sortedImages.map(img => ({
      src: img.file_path, // Backend already processes URLs
      caption: img.alt_text || 'Imagem do Serviço',
      isPrimary: img.is_primary || false,
      displayOrder: img.display_order || 0
    }));
  }
  
  // Priority 3: Fall back to legacy static fields for backward compatibility
  const getFullImageUrl = (relativePath) => buildAssetUrl(relativePath);
  
  if (service?.image) {
    const fullUrl = getFullImageUrl(service.image);
    if (fullUrl) images.push({ src: fullUrl, caption: "Imagem do Serviço" });
  }
  if (service?.image_liso) {
    const fullUrl = getFullImageUrl(service.image_liso);
    if (fullUrl) images.push({ src: fullUrl, caption: "Liso" });
  }
  if (service?.image_ondulado) {
    const fullUrl = getFullImageUrl(service.image_ondulado);
    if (fullUrl) images.push({ src: fullUrl, caption: "Ondulado" });
  }
  if (service?.image_cacheado) {
    const fullUrl = getFullImageUrl(service.image_cacheado);
    if (fullUrl) images.push({ src: fullUrl, caption: "Cacheado" });
  }
  if (service?.image_crespo) {
    const fullUrl = getFullImageUrl(service.image_crespo);
    if (fullUrl) images.push({ src: fullUrl, caption: "Crespo" });
  }
  
  return images;
};

/**
 * Get the primary image URL for a service
 * @param {Object} service - Service object
 * @returns {string|null} Primary image URL or null
 */
export const getPrimaryServiceImage = (service) => {
  if (!service) return null;
  
  // Check new images array first
  if (service.images && Array.isArray(service.images)) {
    const primaryImage = service.images.find(img => img.is_primary);
    if (primaryImage) return primaryImage.file_path;
    
    // If no primary, get first image ordered by display_order
    const sortedImages = [...service.images].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    if (sortedImages.length > 0) return sortedImages[0].file_path;
  }
  
  // Fall back to legacy fields
  if (service.image_url) return service.image_url;
  if (service.image) return buildAssetUrl(service.image);
  
  return null;
};

/**
 * Check if service has any images (new or legacy)
 * @param {Object} service - Service object
 * @returns {boolean} True if service has images
 */
export const hasServiceImages = (service) => {
  if (!service) return false;
  
  // Check new images array
  if (service.images && Array.isArray(service.images) && service.images.length > 0) {
    return true;
  }
  
  // Check legacy fields
  return !!(service.image || service.image_url || service.image_liso || 
           service.image_ondulado || service.image_cacheado || service.image_crespo);
};