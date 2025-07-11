/**
 * Service Variations API Service
 * Handles fetching service variation groups and variations for services
 */

import { withApiErrorHandling, buildApiEndpoint } from '../utils/apiHelpers';
import apiClient from '../config/api';


/**
 * Fetches all variation groups with their variations for a specific service
 * @param {string} serviceId - The ID of the service
 * @returns {Promise<Array>} Array of variation groups with their variations
 */
export const getServiceVariations = async (serviceId) => {
  if (!serviceId) {
    throw new Error('Service ID is required to fetch variations.');
  }
  
  const endpoint = buildApiEndpoint(`variation-groups/service/${serviceId}/full`);
  
  try {
    const response = await apiClient.get(endpoint);
    const data = response.data;
    
    if (!Array.isArray(data)) {
      return [];
    }
    
    if (data.length === 0) {
      return [];
    }
    
    // Transform the variation groups data for frontend consumption
    const transformed = data.map(group => ({
      id: group.id,
      name: group.name,
      service_id: group.service_id,
      variations: (group.variations || []).map(variation => ({
        id: variation.id,
        name: variation.name,
        price_delta: parseFloat(variation.price_delta || 0),
        duration_delta: parseInt(variation.duration_delta || 0),
        display_order: variation.display_order || 0,
        price_subject_to_evaluation: variation.price_subject_to_evaluation || false,
        service_variation_group_id: variation.service_variation_group_id
      })).sort((a, b) => a.display_order - b.display_order)
    }));
    
    return transformed;
    
  } catch (error) {
    // Return empty array on error
    return [];
  }
};

/**
 * Helper function to check if a service has variations
 * @param {string} serviceId - The ID of the service
 * @returns {Promise<boolean>} True if service has variations
 */
export const hasServiceVariations = async (serviceId) => {
  try {
    const variations = await getServiceVariations(serviceId);
    return variations.length > 0 && variations.some(group => group.variations.length > 0);
  } catch (error) {
    return false;
  }
};

/**
 * Helper function to calculate final price with variation
 * @param {number} basePrice - Base service price
 * @param {Object} selectedVariations - Object with variation group ID as key and variation as value
 * @returns {number} Final price including variation deltas
 */
export const calculateFinalPrice = (basePrice, selectedVariations = {}) => {
  const base = parseFloat(basePrice || 0);
  const variationDeltas = Object.values(selectedVariations)
    .map(variation => parseFloat(variation?.price_delta || 0))
    .reduce((sum, delta) => sum + delta, 0);
  
  return base + variationDeltas;
};

/**
 * Helper function to calculate final duration with variation
 * @param {number} baseDuration - Base service duration in minutes
 * @param {Object} selectedVariations - Object with variation group ID as key and variation as value
 * @returns {number} Final duration including variation deltas
 */
export const calculateFinalDuration = (baseDuration, selectedVariations = {}) => {
  const base = parseInt(baseDuration || 0);
  const variationDeltas = Object.values(selectedVariations)
    .map(variation => parseInt(variation?.duration_delta || 0))
    .reduce((sum, delta) => sum + delta, 0);
  
  return Math.max(0, base + variationDeltas); // Ensure duration is never negative
};

/**
 * Helper function to get variation display text
 * @param {Object} variation - Variation object
 * @param {number} basePrice - Base service price (optional)
 * @returns {string} Display text for the variation
 */
export const getVariationDisplayText = (variation, basePrice = null) => {
  if (!variation) return '';
  
  const { name, price_delta } = variation;
  const delta = parseFloat(price_delta || 0);
  
  // If basePrice is provided, show final price instead of delta
  if (basePrice !== null) {
    const finalPrice = parseFloat(basePrice) + delta;
    const formattedPrice = `R$ ${finalPrice.toFixed(2).replace('.', ',')}`;
    return `${name} ${formattedPrice}`;
  }
  
  // Fallback to delta display if basePrice not provided
  if (delta === 0) {
    return name;
  }
  
  const sign = delta > 0 ? '+' : '';
  const formattedDelta = `${sign}R$ ${Math.abs(delta).toFixed(2).replace('.', ',')}`;
  
  return `${name} ${formattedDelta}`;
};