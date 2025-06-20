import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom'; // For components using Link/Navigate
import DailySchedulePage from './DailySchedulePage';
import * as appointmentsApi from '../../../Services/appointmentsApi'; // To mock getDailySchedule

// Mock react-router-dom hooks
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'), // Preserve other exports
  useNavigate: () => jest.fn(), // Mock useNavigate
  useParams: () => ({}), // Mock useParams if needed, returning empty object for now
  // Mock other hooks like useLocation if they are used by the component
}));

// Mock the appointmentsApi
jest.mock('../../../Services/appointmentsApi');

// Mock any other external dependencies or context providers if necessary
// For example, if using a global AuthContext:
// jest.mock('../../../Contexts/AuthContext', () => ({
//   useAuth: () => ({ tenantId: 'mock-tenant-id', user: { role: 'admin' } }),
// }));


// Helper function to wrap component in MemoryRouter for tests if it uses routing features
const renderWithRouter = (ui, { route = '/' } = {}) => {
  window.history.pushState({}, 'Test page', route);
  return render(ui, { wrapper: MemoryRouter });
};

describe('DailySchedulePage', () => {
  // Restore console.error mock after each test to avoid interference
  let originalConsoleError;
  beforeEach(() => {
    originalConsoleError = console.error;
    console.error = jest.fn(); // Suppress console.error output during tests for cleaner results
    // Reset mocks before each test
    appointmentsApi.getDailySchedule.mockReset();
  });

  afterEach(() => {
    console.error = originalConsoleError; // Restore console.error
  });

  test('renders initial structure and fetches data on load', async () => {
    const mockToday = new Date(2024, 5, 15); // June 15, 2024 - Use a fixed date for testing
    jest.useFakeTimers().setSystemTime(mockToday);

    appointmentsApi.getDailySchedule.mockResolvedValueOnce({
      date: '2024-06-15',
      professionals: [], // Start with empty professionals to test initial load
    });

    renderWithRouter(<DailySchedulePage />);

    // Check for header elements
    expect(screen.getByText('Agenda Diária')).toBeInTheDocument();
    expect(screen.getByText('Hoje')).toBeInTheDocument(); // Today button
    expect(screen.getByLabelText('Buscar Profissional...')).toBeInTheDocument();
    expect(screen.getByLabelText('Buscar Cliente...')).toBeInTheDocument();

    // Check that getDailySchedule was called with today's date
    await waitFor(() => {
      expect(appointmentsApi.getDailySchedule).toHaveBeenCalledWith(mockToday);
    });

    jest.useRealTimers(); // Restore real timers
  });

  test('displays loading spinner while fetching data', () => {
    // Prevent mock from resolving immediately to show spinner
    appointmentsApi.getDailySchedule.mockImplementation(() => new Promise(() => {}));

    renderWithRouter(<DailySchedulePage />);
    expect(screen.getByText('Carregando agenda...')).toBeInTheDocument();
    // Or check for spinner role: expect(screen.getByRole('status')).toBeInTheDocument(); (if Spinner has role="status")
  });

  test('displays error message if API call fails', async () => {
    const errorMessage = 'Falha ao carregar dados da API.';
    appointmentsApi.getDailySchedule.mockRejectedValueOnce(new Error(errorMessage));

    renderWithRouter(<DailySchedulePage />);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  // More tests will follow for data display, interactions, etc.

  describe('Data Display', () => {
    const mockScheduleData = {
      date: '2024-06-15',
      professionals: [
        {
          id: 'prof1',
          name: 'Dr. Ana Silva',
          photoUrl: 'https://example.com/ana.jpg',
          appointments: [
            {
              id: 'apt1',
              clientName: 'Carlos Lima',
              startTime: '09:00', // Already formatted by API service mock
              startTimeISO: '2024-06-15T09:00:00.000Z',
              endTimeISO: '2024-06-15T10:00:00.000Z',
              duration: 60,
              services: ['Consulta'],
              status: 'Confirmado',
              _originalServices: [{id: 's1', name: 'Consulta'}]
            },
          ],
          blockedSlots: [
            {
              id: 'block1',
              startTime: '13:00',  // Already formatted
              startTimeISO: '2024-06-15T13:00:00.000Z',
              endTimeISO: '2024-06-15T14:00:00.000Z',
              duration: 60,
              reason: 'Almoço',
              type: 'blocked'
            },
          ],
        },
        {
          id: 'prof2',
          name: 'Beatriz Costa',
          photoUrl: null, // No photo, should display initials
          appointments: [],
          blockedSlots: [],
        },
      ],
    };

    beforeEach(() => {
      // Provide the mock data for tests in this describe block
      appointmentsApi.getDailySchedule.mockResolvedValue(mockScheduleData);
    });

    test('renders professionals names and photos/initials', async () => {
      renderWithRouter(<DailySchedulePage />);
      await waitFor(() => { // Wait for data to be processed
        expect(screen.getByText('Dr. Ana Silva')).toBeInTheDocument();
        expect(screen.getByAltText('Dr. Ana Silva')).toHaveAttribute('src', 'https://example.com/ana.jpg');

        expect(screen.getByText('Beatriz Costa')).toBeInTheDocument();
        // Check for initials - the component creates "BC"
        expect(screen.getByText((content, element) => {
            // Custom text matcher for initials, as they are within a div
            return element.tagName.toLowerCase() === 'div' && content.startsWith('BC');
        })).toBeInTheDocument();
      });
    });

    test('renders time slots', async () => {
      renderWithRouter(<DailySchedulePage />);
      await waitFor(() => {
        // Check for a few sample time slots (assuming 08:00 to 20:00, 30-min intervals)
        expect(screen.getByText('08:00')).toBeInTheDocument();
        expect(screen.getByText('12:30')).toBeInTheDocument();
        expect(screen.getByText('19:30')).toBeInTheDocument();
      });
    });

    test('renders appointments correctly', async () => {
      renderWithRouter(<DailySchedulePage />);
      await waitFor(() => {
        // Check for appointment details
        expect(screen.getByText('Carlos Lima')).toBeInTheDocument(); // Client name
        expect(screen.getByText('Consulta')).toBeInTheDocument(); // Service name as badge
        // Check if it's roughly in the right professional column and time row.
        // This can be complex due to grid structure. A simpler check is its presence.
      });
    });

    test('renders blocked slots correctly', async () => {
      renderWithRouter(<DailySchedulePage />);
      await waitFor(() => {
        // Check for blocked slot details
        expect(screen.getByText('Almoço')).toBeInTheDocument(); // Reason for block
        // Check if it's in Dr. Ana Silva's column
      });
    });
  });

  describe('Interactions', () => {
    const mockToday = new Date(2024, 5, 15); // June 15, 2024
    const initialMockData = { date: '2024-06-15', professionals: [{ id: 'prof1', name: 'Dr. Ana', photoUrl: null, appointments: [], blockedSlots: [] }] };

    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(mockToday);
      appointmentsApi.getDailySchedule.mockResolvedValue(initialMockData);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('clicking "Hoje" button fetches data for current date', async () => {
      renderWithRouter(<DailySchedulePage />);
      await waitFor(() => expect(appointmentsApi.getDailySchedule).toHaveBeenCalledTimes(1)); // Initial fetch

      // Simulate changing date then clicking "Hoje"
      const nextDayButton = screen.getByText((content, element) => element.tagName.toLowerCase() === 'button' && content.startsWith('Próximo'));
      fireEvent.click(nextDayButton);

      const expectedNextDate = new Date(mockToday);
      expectedNextDate.setDate(mockToday.getDate() + 1);
      await waitFor(() => expect(appointmentsApi.getDailySchedule).toHaveBeenCalledWith(expectedNextDate));

      const todayButton = screen.getByText('Hoje');
      fireEvent.click(todayButton);

      // Should be called again with the original mockToday
      await waitFor(() => expect(appointmentsApi.getDailySchedule).toHaveBeenCalledWith(mockToday));
      expect(appointmentsApi.getDailySchedule).toHaveBeenCalledTimes(3);
    });

    test('clicking "Anterior" and "Próximo" buttons fetches data for adjusted dates', async () => {
      renderWithRouter(<DailySchedulePage />);
      await waitFor(() => expect(appointmentsApi.getDailySchedule).toHaveBeenCalledTimes(1));

      const prevButton = screen.getByText((content, element) => element.tagName.toLowerCase() === 'button' && content.includes('Anterior'));
      fireEvent.click(prevButton);
      const expectedPrevDate = new Date(mockToday);
      expectedPrevDate.setDate(mockToday.getDate() - 1);
      await waitFor(() => expect(appointmentsApi.getDailySchedule).toHaveBeenCalledWith(expectedPrevDate));

      const nextButton = screen.getByText((content, element) => element.tagName.toLowerCase() === 'button' && content.startsWith('Próximo'));
      fireEvent.click(nextButton); // Back to today
      await waitFor(() => expect(appointmentsApi.getDailySchedule).toHaveBeenCalledWith(mockToday));
      fireEvent.click(nextButton); // To next day
      const expectedNextDate = new Date(mockToday);
      expectedNextDate.setDate(mockToday.getDate() + 1);
      await waitFor(() => expect(appointmentsApi.getDailySchedule).toHaveBeenCalledWith(expectedNextDate));
    });

    test('changing date via date picker fetches data for new date', async () => {
      renderWithRouter(<DailySchedulePage />);
      await waitFor(() => expect(appointmentsApi.getDailySchedule).toHaveBeenCalledTimes(1));

      const dateInput = screen.getByDisplayValue('2024-06-15'); // HTML input type="date" value format
      fireEvent.change(dateInput, { target: { value: '2024-06-20' } });

      const expectedNewDate = new Date(2024, 5, 20); // June 20, 2024
      await waitFor(() => expect(appointmentsApi.getDailySchedule).toHaveBeenCalledWith(expectedNewDate));
    });

    test('professional search filters displayed professionals', async () => {
      const detailedMockData = {
        date: '2024-06-15',
        professionals: [
          { id: 'prof1', name: 'Dr. Ana Silva', photoUrl: null, appointments: [], blockedSlots: [] },
          { id: 'prof2', name: 'Carlos Rocha', photoUrl: null, appointments: [], blockedSlots: [] },
        ],
      };
      appointmentsApi.getDailySchedule.mockResolvedValue(detailedMockData);
      renderWithRouter(<DailySchedulePage />);

      await waitFor(() => {
        expect(screen.getByText('Dr. Ana Silva')).toBeInTheDocument();
        expect(screen.getByText('Carlos Rocha')).toBeInTheDocument();
      });

      const profSearchInput = screen.getByLabelText('Buscar Profissional...');
      fireEvent.change(profSearchInput, { target: { value: 'Ana' } });

      await waitFor(() => {
        expect(screen.getByText('Dr. Ana Silva')).toBeInTheDocument();
        expect(screen.queryByText('Carlos Rocha')).not.toBeInTheDocument();
      });
    });

    test('client search filters/dims appointments', async () => {
      const clientSearchMockData = {
        date: '2024-06-15',
        professionals: [
          {
            id: 'prof1', name: 'Dr. Ana Silva', photoUrl: null,
            appointments: [
              { id: 'apt1', clientName: 'Cliente A', startTime: '09:00', duration: 60, services: ['Svc1'], status: 'C', startTimeISO: '2024-06-15T09:00:00Z', endTimeISO: '2024-06-15T10:00:00Z', _originalServices:[] },
              { id: 'apt2', clientName: 'Cliente B', startTime: '10:00', duration: 30, services: ['Svc2'], status: 'C', startTimeISO: '2024-06-15T10:00:00Z', endTimeISO: '2024-06-15T10:30:00Z', _originalServices:[] },
            ],
            blockedSlots: []
          },
        ],
      };
      appointmentsApi.getDailySchedule.mockResolvedValue(clientSearchMockData);
      renderWithRouter(<DailySchedulePage />);

      await waitFor(() => {
        expect(screen.getByText('Cliente A')).toBeInTheDocument();
        expect(screen.getByText('Cliente B')).toBeInTheDocument();
      });

      const clientSearchInput = screen.getByLabelText('Buscar Cliente...');
      fireEvent.change(clientSearchInput, { target: { value: 'Cliente A' } });

      await waitFor(() => {
        // Check opacity or specific class indicating dimming/highlighting
        // For simplicity, we check presence of A, and B might be styled with opacity
        // RTL doesn't directly check styles like opacity, but structure might change or specific classes might be added.
        // Assuming the current implementation adds 'opacity-30' to non-matching cards.
        const appointmentCardA = screen.getByText('Cliente A').closest('div[style*="grid-row"] > div');
        const appointmentCardB = screen.getByText('Cliente B').closest('div[style*="grid-row"] > div');

        expect(appointmentCardA).not.toHaveClass('opacity-30');
        expect(appointmentCardB).toHaveClass('opacity-30');
      });
    });
  });

  describe('Empty States', () => {
    test('shows message if no professionals are available', async () => {
      appointmentsApi.getDailySchedule.mockResolvedValueOnce({ date: '2024-06-15', professionals: [] });
      renderWithRouter(<DailySchedulePage />);
      await waitFor(() => {
        expect(screen.getByText('Nenhum profissional ativo para esta data.')).toBeInTheDocument();
      });
    });

    test('shows message if professional has no appointments or blocked slots', async () => {
      // This is implicitly tested by the Data Display tests if a professional has empty arrays.
      // Explicitly:
      const noActivityMock = {
        date: '2024-06-15',
        professionals: [
          { id: 'prof1', name: 'Dr. Vago', photoUrl: null, appointments: [], blockedSlots: [] }
        ],
      };
      appointmentsApi.getDailySchedule.mockResolvedValueOnce(noActivityMock);
      renderWithRouter(<DailySchedulePage />);
      await waitFor(() => {
        expect(screen.getByText('Dr. Vago')).toBeInTheDocument();
        // No specific message for "no appointments for this prof", but their column would be empty of appt/block cards
        // The test for rendering appointments/blocked slots would fail if it expected some.
      });
    });
  });
});
