/**
 * Image Utility functions for dynamic service images
 * Handles the new ServiceImage table structure with proper ordering and primary image logic
 */

import { buildAssetUrl } from './urlHelpers';

/**
 * Main function to build service images array compatible with existing UI components
 * Handles both new images array structure and legacy static fields for backward compatibility
 * @param {Object} service - Service object
 * @returns {Array} Array of image objects with src and caption
 */
export const buildServiceImages = (service) => {
  if (!service) return [];

  // Priority 1: Use new images array if available
  if (service.images && Array.isArray(service.images) && service.images.length > 0) {
    return getOrderedServiceImages(service);
  }

  // Priority 2: Fall back to legacy static fields
  return buildLegacyServiceImages(service);
};

/**
 * Get primary image only
 * @param {Object} service - Service object
 * @returns {Object|null} Primary image object or null
 */
export const getPrimaryServiceImage = (service) => {
  if (!service) return null;

  // Check new images array first
  if (service.images && Array.isArray(service.images) && service.images.length > 0) {
    // Find primary image
    const primaryImage = service.images.find(img => img.is_primary);
    if (primaryImage) {
      return {
        src: primaryImage.file_path,
        caption: primaryImage.alt_text || service.name || 'Imagem do Serviço',
        isPrimary: true,
        displayOrder: primaryImage.display_order || 0
      };
    }

    // If no primary, get first image ordered by display_order
    const sortedImages = [...service.images].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    if (sortedImages.length > 0) {
      const firstImage = sortedImages[0];
      return {
        src: firstImage.file_path,
        caption: firstImage.alt_text || service.name || 'Imagem do Serviço',
        isPrimary: firstImage.is_primary || false,
        displayOrder: firstImage.display_order || 0
      };
    }
  }

  // Fall back to legacy fields
  if (service.image) {
    return {
      src: buildAssetUrl(service.image),
      caption: service.name || 'Imagem do Serviço',
      isPrimary: true,
      displayOrder: 0
    };
  }

  return null;
};

/**
 * Get all images ordered by display_order
 * @param {Object} service - Service object
 * @returns {Array} Array of ordered service images
 */
export const getOrderedServiceImages = (service) => {
  if (!service || !service.images || !Array.isArray(service.images)) {
    return [];
  }

  // Sort by display_order and convert to UI format
  const sortedImages = [...service.images].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

  return sortedImages.map(img => ({
    src: img.file_path, // Backend already processes URLs to full paths
    caption: img.alt_text || service.name || 'Imagem do Serviço',
    isPrimary: img.is_primary || false,
    displayOrder: img.display_order || 0,
    id: img.id
  }));
};

/**
 * Fallback to static images if no dynamic images
 * @param {Object} service - Service object
 * @returns {Array} Array of legacy service images
 */
export const buildLegacyServiceImages = (service) => {
  if (!service) return [];

  const images = [];

  // Process legacy image fields with proper URL building
  if (service.image) {
    const fullUrl = buildAssetUrl(service.image);
    if (fullUrl) {
      images.push({
        src: fullUrl,
        caption: service.name || 'Imagem do Serviço',
        isPrimary: true,
        displayOrder: 0
      });
    }
  }

  if (service.image_liso) {
    const fullUrl = buildAssetUrl(service.image_liso);
    if (fullUrl) {
      images.push({
        src: fullUrl,
        caption: 'Liso',
        isPrimary: false,
        displayOrder: 1
      });
    }
  }

  if (service.image_ondulado) {
    const fullUrl = buildAssetUrl(service.image_ondulado);
    if (fullUrl) {
      images.push({
        src: fullUrl,
        caption: 'Ondulado',
        isPrimary: false,
        displayOrder: 2
      });
    }
  }

  if (service.image_cacheado) {
    const fullUrl = buildAssetUrl(service.image_cacheado);
    if (fullUrl) {
      images.push({
        src: fullUrl,
        caption: 'Cacheado',
        isPrimary: false,
        displayOrder: 3
      });
    }
  }

  if (service.image_crespo) {
    const fullUrl = buildAssetUrl(service.image_crespo);
    if (fullUrl) {
      images.push({
        src: fullUrl,
        caption: 'Crespo',
        isPrimary: false,
        displayOrder: 4
      });
    }
  }

  return images;
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
  return !!(service.image || service.image_liso || service.image_ondulado || 
           service.image_cacheado || service.image_crespo);
};

/**
 * Get images filtered by type or criteria
 * @param {Object} service - Service object
 * @param {Object} options - Filter options
 * @param {boolean} options.primaryOnly - Return only primary image
 * @param {number} options.limit - Limit number of images returned
 * @returns {Array} Filtered array of images
 */
export const getFilteredServiceImages = (service, options = {}) => {
  const { primaryOnly = false, limit } = options;
  
  let images = buildServiceImages(service);

  if (primaryOnly) {
    const primaryImage = images.find(img => img.isPrimary);
    images = primaryImage ? [primaryImage] : images.slice(0, 1);
  }

  if (limit && typeof limit === 'number' && limit > 0) {
    images = images.slice(0, limit);
  }

  return images;
};

/**
 * Validate image URL and handle errors gracefully
 * @param {string} imageUrl - Image URL to validate
 * @returns {boolean} True if URL appears valid
 */
export const isValidImageUrl = (imageUrl) => {
  if (!imageUrl || typeof imageUrl !== 'string') return false;
  
  try {
    // Check if it's a valid URL or valid relative path
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      new URL(imageUrl);
      return true;
    }
    
    // Check if it's a valid relative path
    if (imageUrl.startsWith('/') || imageUrl.includes('.')) {
      return true;
    }
    
    return false;
  } catch {
    return false;
  }
};

/**
 * Get image URL with fallback handling
 * @param {Object} image - Image object
 * @param {string} fallbackUrl - Fallback URL if primary fails
 * @returns {string} Image URL or fallback
 */
export const getImageUrlWithFallback = (image, fallbackUrl = null) => {
  if (!image) return fallbackUrl;
  
  if (isValidImageUrl(image.src)) {
    return image.src;
  }
  
  return fallbackUrl;
};