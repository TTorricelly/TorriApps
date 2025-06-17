// Shared types and interfaces for the mobile client

// User type from auth store
export type UserType = {
  id?: string;
  email?: string;
  fullName?: string;
  role?: string;
  isActive?: boolean;
  phone_number?: string;
  photo_path?: string;
  // Add other fields that your user object might contain
} | null;

// Category interface for service categories
export interface Category {
  id: string;
  name: string;
  icon_url: string | null; // From API
  backgroundColor?: string;
  iconColor?: string;
  icon?: (props: any) => JSX.Element;
  display_order?: number;
}

// Service interface for individual services
export interface Service {
  id: string; // UUID as string
  name: string;
  duration_minutes: number;
  price: string; // Keep as string for now, formatting handled in UI
  description?: string | null;
  category_id?: string; // UUID as string
  image_liso?: string | null;
  image_ondulado?: string | null;
  image_cacheado?: string | null;
  image_crespo?: string | null;
}

// Professional interface for service providers
export interface Professional {
  id: number;
  name: string;
  image: string;
}

// Date option for appointment scheduling
export interface DateOption {
  day: string;
  date: string;
  month: string;
  fullDate: string;
}

// Salon information
export interface SalonInfo {
  name: string;
  address: string;
}

// Screen types for navigation
export type ScreenType = 
  | 'categories' 
  | 'services' 
  | 'service-details' 
  | 'scheduling' 
  | 'confirmation' 
  | 'orders';

// Props for screens that need navigation and screen management
export interface BaseScreenProps {
  onNavigate: (screen: ScreenType) => void;
  onScrollToTop?: (scrollRef: React.RefObject<any>) => void;
}

// Appointment booking state
export interface AppointmentState {
  selectedService: Service | null;
  selectedDate: DateOption | null;
  selectedProfessional: Professional | null;
  selectedTime: string | null;
  observations: string;
}

// Props for appointment-related screens
export interface AppointmentScreenProps extends BaseScreenProps {
  appointmentState: AppointmentState;
  setSelectedDate: (date: DateOption | null) => void;
  setSelectedProfessional: (professional: Professional | null) => void;
  setSelectedTime: (time: string | null) => void;
  availableDates: DateOption[];
  professionals: Professional[];
  availableTimes: string[];
  scrollRef: React.RefObject<any>;
}

export interface AppointmentConfirmationProps extends BaseScreenProps {
  appointmentState: AppointmentState;
  setObservations: (observations: string) => void;
  salonInfo: SalonInfo;
  scrollRef: React.RefObject<any>;
}