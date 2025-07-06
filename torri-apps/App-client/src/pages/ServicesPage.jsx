/**
 * ServicesPage Component (Web Version)
 * Maintains identical business logic and design from Mobile-client-core ServicesScreen.tsx
 * Features: Swipeable cards, expandable details, image carousels, gesture interactions
 */

import React, { useState, useRef } from 'react';
import { useNavigation } from '../shared/hooks/useNavigation';
import { ROUTES } from '../shared/navigation';
import { 
  ArrowLeft, 
  ShoppingCart, 
  Plus, 
  Trash2, 
  Eye,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import BottomNavigation from '../components/BottomNavigation';
import useServicesStore from '../stores/servicesStore';
import { buildAssetUrl } from '../utils/urlHelpers';
import { buildServiceImages } from '../utils/imageUtils';
import SchedulingWizardModal from '../components/SchedulingWizardModal';

const ServicesPage = () => {
  const { navigate } = useNavigation();
  const { selectedServices, removeService, clearServices, getTotalPrice, getTotalDuration } = useServicesStore();
  
  // State for expandable cards (identical to mobile pattern)
  const [expandedServiceIds, setExpandedServiceIds] = useState(new Set());
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [selectedImageForModal, setSelectedImageForModal] = useState(null);
  
  // State for scheduling wizard modal
  const [wizardModalVisible, setWizardModalVisible] = useState(false);

  // Helper functions (identical to mobile)
  const formatDuration = (minutes) => {
    if (minutes === undefined || minutes === null || minutes <= 0) return '-';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h > 0 ? h + 'h ' : ''}${m > 0 ? m + 'min' : ''}`.trim() || '-';
  };

  const formatPrice = (priceStr) => {
    const priceNum = typeof priceStr === 'number' ? priceStr : parseFloat(priceStr);
    if (isNaN(priceNum)) return 'R$ -';
    return `R$ ${priceNum.toFixed(2).replace('.', ',')}`;
  };

  const getFullImageUrl = (relativePath) => {
    return buildAssetUrl(relativePath);
  };

  // buildServiceImages function now imported from imageUtils utility

  // Service card expansion handlers (identical to mobile pattern)
  const handleToggleServiceExpansion = (serviceId) => {
    setExpandedServiceIds(prev => {
      const newSet = new Set();
      // If the clicked service is already expanded, close it (empty set)
      // Otherwise, expand only the clicked service
      if (!prev.has(serviceId)) {
        newSet.add(serviceId);
      }
      return newSet;
    });
  };

  const isServiceExpanded = (serviceId) => {
    return expandedServiceIds.has(serviceId);
  };

  // Handle image modal
  const handleImagePress = (imageUrl) => {
    setSelectedImageForModal(imageUrl);
    setImageModalVisible(true);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-hidden">
        {/* Fixed Header */}
        <div className="fixed top-0 left-0 right-0 z-40 bg-pink-500">
          <div className="safe-area-top px-6 py-4 flex items-center">
            <button
              onClick={() => navigate(ROUTES.DASHBOARD)}
              className="mr-4 p-2 hover:bg-pink-600 rounded-lg transition-smooth"
            >
              <ArrowLeft size={24} className="text-white" />
            </button>
            <h1 className="text-xl font-bold text-white flex-1">
              Serviços Selecionados
            </h1>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="h-full overflow-y-auto mobile-scroll" style={{ paddingTop: '80px', paddingBottom: '160px' }}>
          {/* Main Content */}
          <div className="bg-white px-6 py-8 min-h-0">
            {selectedServices.length === 0 ? (
              // Empty State (identical to mobile)
              <div className="text-center py-16">
                <ShoppingCart size={64} className="text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-6 text-lg leading-relaxed">
                  Nenhum serviço selecionado ainda.{'\n'}
                  Adicione serviços a partir da tela inicial.
                </p>
                
                <button
                  onClick={() => navigate(ROUTES.DASHBOARD)}
                  className="inline-flex items-center space-x-2 px-6 py-3 border border-pink-500 text-pink-500 rounded-xl hover:bg-pink-50 transition-smooth"
                >
                  <Plus size={20} />
                  <span className="font-semibold">Adicionar Serviço</span>
                </button>
              </div>
            ) : (
              // Service Cards List
              <div className="space-y-4">
                {selectedServices.map((service) => {
                  const isExpanded = isServiceExpanded(service.id);
                  const serviceImages = buildServiceImages(service);
                  
                  return (
                    <SwipeableServiceCard
                      key={service.id}
                      service={service}
                      isExpanded={isExpanded}
                      onToggleExpanded={handleToggleServiceExpansion}
                      onRemove={removeService}
                      onImagePress={handleImagePress}
                      serviceImages={serviceImages}
                      formatDuration={formatDuration}
                      formatPrice={formatPrice}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Action Bar (identical to mobile pattern) */}
      {selectedServices.length > 0 && (
        <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 p-4 z-50">
          {/* Total Price Display */}
          <div className="flex justify-between items-center mb-4">
            <span className="text-gray-700 font-medium">
              Total ({selectedServices.length} {selectedServices.length === 1 ? 'serviço' : 'serviços'}):
            </span>
            <span className="text-xl font-bold text-pink-600">
              {formatPrice(getTotalPrice())}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button 
              onClick={() => navigate(ROUTES.DASHBOARD)}
              className="flex-1 flex items-center justify-center space-x-2 py-3 border border-pink-500 text-pink-500 rounded-xl hover:bg-pink-50 transition-smooth"
            >
              <Plus size={18} />
              <span className="font-semibold">Serviços</span>
            </button>
            
            <button 
              onClick={() => {
                // Open scheduling wizard modal
                setWizardModalVisible(true);
              }}
              className="flex-2 py-3 px-6 bg-pink-500 text-white rounded-xl font-bold hover:bg-pink-600 transition-smooth"
            >
              Escolher data
            </button>
          </div>
        </div>
      )}

      {/* Image Modal */}
      {imageModalVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={() => setImageModalVisible(false)}>
          <div className="relative max-w-md max-h-96 m-4">
            <button
              onClick={() => setImageModalVisible(false)}
              className="absolute top-2 right-2 p-2 bg-black bg-opacity-50 text-white rounded-full z-10"
            >
              <X size={20} />
            </button>
            <img
              src={selectedImageForModal}
              alt="Service"
              className="w-full h-full object-contain rounded-lg"
            />
          </div>
        </div>
      )}

      {/* Scheduling Wizard Modal */}
      {wizardModalVisible && (
        <SchedulingWizardModal
          isVisible={wizardModalVisible}
          onClose={() => setWizardModalVisible(false)}
          selectedServices={selectedServices}
        />
      )}

      <BottomNavigation />
    </div>
  );
};

// SwipeableServiceCard Component (identical to mobile functionality)
const SwipeableServiceCard = ({ 
  service, 
  isExpanded, 
  onToggleExpanded, 
  onRemove, 
  onImagePress, 
  serviceImages,
  formatDuration,
  formatPrice 
}) => {
  const [isRemoving, setIsRemoving] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const cardRef = useRef(null);
  const startX = useRef(0);
  const currentX = useRef(0);

  // Touch/Mouse handlers for swipe gesture (web adaptation of mobile swipe)
  const handleStart = (clientX) => {
    startX.current = clientX;
    currentX.current = clientX;
  };

  const handleMove = (clientX) => {
    if (startX.current === 0) return;
    
    currentX.current = clientX;
    const diff = clientX - startX.current;
    
    // Only allow left swipe (negative values)
    if (diff < 0) {
      setSwipeOffset(Math.max(diff, -120));
    }
  };

  const handleEnd = () => {
    const diff = currentX.current - startX.current;
    
    if (diff < -80) {
      // Trigger removal
      setIsRemoving(true);
      setTimeout(() => {
        onRemove(service.id);
      }, 200);
    } else {
      // Snap back
      setSwipeOffset(0);
    }
    
    startX.current = 0;
    currentX.current = 0;
  };

  return (
    <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Red background for swipe-to-delete */}
      <div className="absolute inset-0 bg-red-500 flex items-center justify-end pr-6">
        <div className="flex items-center space-x-2 text-white">
          <Trash2 size={20} />
          <span className="font-semibold">Remover</span>
        </div>
      </div>

      {/* Main card content */}
      <div 
        ref={cardRef}
        className={`relative bg-white transition-transform duration-200 ${isRemoving ? 'opacity-0 -translate-x-full' : ''}`}
        style={{ transform: `translateX(${swipeOffset}px)` }}
        onTouchStart={(e) => handleStart(e.touches[0].clientX)}
        onTouchMove={(e) => handleMove(e.touches[0].clientX)}
        onTouchEnd={handleEnd}
        onMouseDown={(e) => handleStart(e.clientX)}
        onMouseMove={(e) => e.buttons === 1 && handleMove(e.clientX)}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
      >
        {/* Service Card Header - Always Visible */}
        <div className="p-4">
          <div className="flex items-start justify-between">
            <div 
              className="flex-1 cursor-pointer"
              onClick={() => onToggleExpanded(service.id)}
            >
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                {service.name}
              </h3>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <span className="text-pink-600 font-bold">
                    {formatPrice(service.price)}
                  </span>
                  <span className="text-gray-500 text-sm">
                    {formatDuration(service.duration_minutes)}
                  </span>
                </div>
                
                {/* Expand hint */}
                <div className="flex items-center space-x-1 text-gray-400">
                  <Eye size={14} />
                  <span className="text-xs">Ver detalhes</span>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => onRemove(service.id)}
              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-smooth ml-2"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>

        {/* Expandable Content */}
        {isExpanded && (
          <div className="border-t border-gray-100 p-4">
            {/* Service Images Carousel */}
            {serviceImages.length > 0 && (
              <div className="mb-4">
                <div className="flex space-x-3 overflow-x-auto pb-2">
                  {serviceImages.map((image, index) => (
                    <div key={index} className="flex-shrink-0">
                      <img
                        src={image.src}
                        alt={image.caption}
                        className="w-24 h-24 rounded-lg object-cover cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => onImagePress(image.src)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Service Description */}
            {service.description && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Descrição</h4>
                <div 
                  className="text-gray-600 text-sm prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: service.description }}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ServicesPage;