import React, { useMemo } from 'react';
import { Card } from '@material-tailwind/react';
import ProfessionalHeader from './ProfessionalHeader';
import CategorySection from './CategorySection';
import ProfessionalActions from './ProfessionalActions';

const ProfessionalCard = React.memo(({
  professional,
  index,
  allCategories = [],
  allServices = [],
  canMoveUp,
  canMoveDown,
  onEdit,
  onMoveUp,
  onMoveDown,
  getInitials
}) => {
  // Group services by category
  const servicesByCategory = useMemo(() => {
    const groupedServices = {};
    
    // Initialize all categories
    allCategories.forEach(category => {
      groupedServices[category.id] = {
        category,
        allServices: [],
        professionalServices: []
      };
    });
    
    // Group all services by category
    allServices.forEach(service => {
      if (groupedServices[service.category_id]) {
        groupedServices[service.category_id].allServices.push(service);
      }
    });
    
    // Add professional's services to their respective categories
    const professionalServiceIds = new Set(
      (professional.services_offered || []).map(s => s.id)
    );
    
    allServices.forEach(service => {
      if (professionalServiceIds.has(service.id) && groupedServices[service.category_id]) {
        groupedServices[service.category_id].professionalServices.push(service);
      }
    });
    
    // Filter out categories with no professional services offered
    return Object.values(groupedServices).filter(group => 
      group.professionalServices.length > 0
    );
  }, [allCategories, allServices, professional.services_offered]);

  const handleCardClick = () => {
    onEdit(professional.id);
  };

  return (
    <Card className="bg-bg-secondary border-bg-tertiary hover:shadow-lg transition-shadow duration-200 cursor-pointer">
      {/* Professional Header */}
      <ProfessionalHeader
        professional={professional}
        orderNumber={professional.display_order || index + 1}
        getInitials={getInitials}
      />

      {/* Actions */}
      <ProfessionalActions
        professional={professional}
        canMoveUp={canMoveUp}
        canMoveDown={canMoveDown}
        onEdit={onEdit}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
      />

      {/* Services by Category */}
      <div 
        className="px-4 pb-4 flex-1"
        onClick={handleCardClick}
      >
        {servicesByCategory.length > 0 ? (
          servicesByCategory.map((group) => (
            <CategorySection
              key={group.category.id}
              category={group.category}
              allServicesInCategory={group.allServices}
              professionalServices={group.professionalServices}
              showAllServices={true}
            />
          ))
        ) : (
          <div className="text-center py-6">
            <p className="text-text-tertiary text-sm">
              Nenhum serviço cadastrado
            </p>
          </div>
        )}
      </div>
    </Card>
  );
});

ProfessionalCard.displayName = 'ProfessionalCard';

export default ProfessionalCard;