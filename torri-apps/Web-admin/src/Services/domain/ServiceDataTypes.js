/**
 * Domain Value Objects for Service Data
 * Following DDD patterns from ai_docs/appointment-refactoring-architectural-patterns.md
 * 
 * These are immutable data structures representing business concepts
 */

/**
 * ServiceVariation Value Object
 * Represents an individual service variation with pricing
 */
export class ServiceVariation {
  constructor({ id, name, priceDeltas, durationDelta, displayOrder, groupId, groupName }) {
    // Freeze object for immutability
    Object.freeze(
      Object.assign(this, {
        id: String(id),
        name: String(name),
        priceDeltas: Number(priceDeltas || 0),
        durationDelta: Number(durationDelta || 0),
        displayOrder: Number(displayOrder || 0),
        groupId: String(groupId),
        groupName: String(groupName)
      })
    );
  }

  /**
   * Factory method to create from API response
   */
  static fromApiData(data) {
    return new ServiceVariation({
      id: data.id,
      name: data.name,
      priceDeltas: data.price_delta,
      durationDelta: data.duration_delta,
      displayOrder: data.display_order,
      groupId: data.group_id,
      groupName: data.group_name
    });
  }
}

/**
 * ServiceVariationGroup Value Object
 * Groups related variations together
 */
export class ServiceVariationGroup {
  constructor({ id, name, variations = [] }) {
    Object.freeze(
      Object.assign(this, {
        id: String(id),
        name: String(name),
        variations: Object.freeze([...variations]) // Deep freeze variations array
      })
    );
  }

  /**
   * Factory method to group variations by group_id
   */
  static fromVariations(variations) {
    const groupsMap = new Map();

    variations.forEach(variation => {
      const groupId = variation.groupId;
      if (!groupsMap.has(groupId)) {
        groupsMap.set(groupId, {
          id: groupId,
          name: variation.groupName,
          variations: []
        });
      }
      groupsMap.get(groupId).variations.push(variation);
    });

    return Array.from(groupsMap.values()).map(group => 
      new ServiceVariationGroup({
        id: group.id,
        name: group.name,
        variations: group.variations
      })
    );
  }
}

/**
 * ServiceData Value Object
 * Represents a complete service with all its information
 */
export class ServiceData {
  constructor({ 
    id, 
    name, 
    description, 
    price, 
    durationMinutes, 
    displayOrder, 
    categoryId,
    categoryName,
    images = [],
    variationGroups = []
  }) {
    Object.freeze(
      Object.assign(this, {
        id: String(id),
        name: String(name),
        description: String(description || ''),
        price: Number(price || 0),
        durationMinutes: Number(durationMinutes || 0),
        displayOrder: Number(displayOrder || 0),
        categoryId: String(categoryId),
        categoryName: String(categoryName),
        images: Object.freeze([...images]),
        variationGroups: Object.freeze([...variationGroups])
      })
    );
  }

  /**
   * Factory method to create from optimized API response
   */
  static fromApiData(data, categoryId, categoryName) {
    // Transform variations into grouped format
    const variations = (data.variations || []).map(v => ServiceVariation.fromApiData(v));
    const variationGroups = ServiceVariationGroup.fromVariations(variations);

    return new ServiceData({
      id: data.id,
      name: data.name,
      description: data.description,
      price: data.price,
      durationMinutes: data.duration_minutes,
      displayOrder: data.display_order,
      categoryId: categoryId,
      categoryName: categoryName,
      images: data.images || [],
      variationGroups: variationGroups
    });
  }

  /**
   * Check if service has variations
   */
  hasVariations() {
    return this.variationGroups.length > 0;
  }

  /**
   * Get all variations as flat array (for modal compatibility)
   */
  getAllVariations() {
    return this.variationGroups.flatMap(group => group.variations);
  }
}

/**
 * ServiceCategory Value Object
 * Represents a service category with its services
 */
export class ServiceCategory {
  constructor({ id, name, iconUrl, displayOrder, services = [] }) {
    Object.freeze(
      Object.assign(this, {
        id: String(id),
        name: String(name),
        iconUrl: String(iconUrl || ''),
        displayOrder: Number(displayOrder || 0),
        services: Object.freeze([...services])
      })
    );
  }

  /**
   * Factory method to create from optimized API response
   */
  static fromApiData(data) {
    const services = (data.services || []).map(serviceData => 
      ServiceData.fromApiData(serviceData, data.id, data.name)
    );

    return new ServiceCategory({
      id: data.id,
      name: data.name,
      iconUrl: data.icon_url,
      displayOrder: data.display_order,
      services: services
    });
  }

  /**
   * Get count of services in this category
   */
  getServiceCount() {
    return this.services.length;
  }
}

/**
 * CompleteServiceData Value Object
 * Represents the complete service data structure for modals
 */
export class CompleteServiceData {
  constructor({ categories = [], allServices = [], professionals = [] }) {
    Object.freeze(
      Object.assign(this, {
        categories: Object.freeze([...categories]),
        allServices: Object.freeze([...allServices]),
        professionals: Object.freeze([...professionals])
      })
    );
  }

  /**
   * Factory method to create from optimized API response
   */
  static fromApiData(categoriesData, professionalsData = []) {
    const categories = categoriesData.map(catData => ServiceCategory.fromApiData(catData));
    
    // Flatten all services for modal compatibility
    const allServices = categories.flatMap(category => category.services);

    return new CompleteServiceData({
      categories: categories,
      allServices: allServices,
      professionals: professionalsData
    });
  }

  /**
   * Get services by category ID
   */
  getServicesByCategory(categoryId) {
    return this.allServices.filter(service => service.categoryId === categoryId);
  }

  /**
   * Get category by ID
   */
  getCategoryById(categoryId) {
    return this.categories.find(cat => cat.id === categoryId);
  }
}