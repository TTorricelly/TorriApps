import React, { useMemo } from 'react';
import { Typography } from '@material-tailwind/react';
import ServicePill from './ServicePill';

const CategorySection = ({ 
  category, 
  allServicesInCategory = [], 
  professionalServices = [],
  showAllServices = false,
  onServiceClick = null,
  isInteractive = false
}) => {

  // Calculate coverage statistics
  const { offeredServices, notOfferedServices, coveragePercentage, totalServices } = useMemo(() => {
    const professionalServiceIds = new Set(professionalServices.map(s => s.id));
    
    const offered = allServicesInCategory.filter(service => 
      professionalServiceIds.has(service.id)
    );
    
    const notOffered = allServicesInCategory.filter(service => 
      !professionalServiceIds.has(service.id)
    );
    
    const total = allServicesInCategory.length;
    const coverage = total > 0 ? Math.round((offered.length / total) * 100) : 0;
    
    return {
      offeredServices: offered,
      notOfferedServices: notOffered,
      coveragePercentage: coverage,
      totalServices: total
    };
  }, [allServicesInCategory, professionalServices]);

  // Determine which services to show - if showAllServices is true, show all services in category
  const { visibleOffered, visibleNotOffered } = useMemo(() => {
    if (showAllServices) {
      return {
        visibleOffered: offeredServices,
        visibleNotOffered: notOfferedServices
      };
    }
    
    return {
      visibleOffered: offeredServices,
      visibleNotOffered: notOfferedServices
    };
  }, [showAllServices, offeredServices, notOfferedServices]);

  // Coverage color coding
  const getCoverageColor = (percentage) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="mb-4">
      {/* Category Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Typography 
            variant="h6" 
            className="text-text-primary font-semibold text-sm"
          >
            {category.name}
          </Typography>
          {!showAllServices && (
            <Typography 
              variant="small" 
              className={`font-medium ${getCoverageColor(coveragePercentage)}`}
            >
              {offeredServices.length}/{totalServices} ({coveragePercentage}%)
            </Typography>
          )}
        </div>
      </div>

      {/* Services Display */}
      <div className="flex flex-wrap gap-1">
        {/* Offered Services */}
        {visibleOffered.map((service) => (
          <ServicePill
            key={service.id}
            service={service}
            isOffered={true}
            size="xs"
            onClick={isInteractive && onServiceClick ? () => onServiceClick(service.id) : null}
          />
        ))}
        
        {/* Not Offered Services */}
        {visibleNotOffered.map((service) => (
          <ServicePill
            key={service.id}
            service={service}
            isOffered={false}
            size="xs"
            onClick={isInteractive && onServiceClick ? () => onServiceClick(service.id) : null}
          />
        ))}
      </div>
      
      {/* Coverage Bar - only show when not showing all services */}
      {!showAllServices && totalServices > 0 && (
        <div className="mt-2">
          <div className="w-full bg-bg-tertiary/50 rounded-full h-1">
            <div
              className={`h-1 rounded-full transition-all duration-300 ${
                coveragePercentage >= 80 ? 'bg-green-500' :
                coveragePercentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${coveragePercentage}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default CategorySection;