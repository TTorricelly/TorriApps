import { getDailySchedule } from './appointmentsApi';
import apiClient from '../api/client'; // Path to the mocked apiClient

// Mock the apiClient
jest.mock('../api/client');

describe('appointmentsApi - getDailySchedule', () => {
  beforeEach(() => {
    // Reset mocks before each test
    apiClient.get.mockReset();
  });

  test('successfully fetches and transforms daily schedule data', async () => {
    const mockDate = new Date(2024, 5, 16); // June 16, 2024
    const dateString = '2024-06-16';

    const mockApiResponse = {
      data: {
        date: dateString,
        professionals_schedule: [
          {
            professional_id: 'prof1',
            professional_name: 'Dr. Test',
            professional_photo_url: 'http://example.com/photo.jpg',
            appointments: [
              {
                id: 'apt1',
                client_name: 'Client X',
                start_time: '2024-06-16T10:00:00Z',
                duration_minutes: 60,
                services: [{ id: 'svc1', name: 'Service One' }],
                status: 'Confirmado',
              },
            ],
            blocked_slots: [
              {
                id: 'block1',
                start_time: '2024-06-16T14:00:00Z',
                duration_minutes: 30,
                reason: 'Lunch Break',
              },
            ],
          },
        ],
      },
    };

    apiClient.get.mockResolvedValueOnce(mockApiResponse);

    const result = await getDailySchedule(mockDate);

    // Check if apiClient.get was called correctly
    expect(apiClient.get).toHaveBeenCalledWith(`/appointments/daily-schedule/${dateString}`);

    // Check the transformed structure
    expect(result.date).toBe(dateString);
    expect(result.professionals).toHaveLength(1);
    const profSchedule = result.professionals[0];
    expect(profSchedule.id).toBe('prof1');
    expect(profSchedule.name).toBe('Dr. Test');
    expect(profSchedule.photoUrl).toBe('http://example.com/photo.jpg');

    // Check transformed appointments
    expect(profSchedule.appointments).toHaveLength(1);
    const appointment = profSchedule.appointments[0];
    expect(appointment.id).toBe('apt1');
    expect(appointment.clientName).toBe('Client X');
    expect(appointment.startTime).toBe(new Date('2024-06-16T10:00:00Z').toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    expect(appointment.startTimeISO).toBe('2024-06-16T10:00:00Z');
    expect(appointment.duration).toBe(60);
    expect(appointment.services).toEqual(['Service One']);
    expect(appointment.status).toBe('Confirmado');
    expect(appointment._originalServices).toEqual([{ id: 'svc1', name: 'Service One' }]);
    expect(appointment.endTimeISO).toBe(new Date(new Date('2024-06-16T10:00:00Z').getTime() + 60 * 60000).toISOString());

    // Check transformed blocked slots
    expect(profSchedule.blockedSlots).toHaveLength(1);
    const blockedSlot = profSchedule.blockedSlots[0];
    expect(blockedSlot.id).toBe('block1');
    expect(blockedSlot.startTime).toBe(new Date('2024-06-16T14:00:00Z').toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    expect(blockedSlot.startTimeISO).toBe('2024-06-16T14:00:00Z');
    expect(blockedSlot.duration).toBe(30);
    expect(blockedSlot.reason).toBe('Lunch Break');
    expect(blockedSlot.type).toBe('blocked');
    expect(blockedSlot.endTimeISO).toBe(new Date(new Date('2024-06-16T14:00:00Z').getTime() + 30 * 60000).toISOString());
  });

  test('handles API error correctly', async () => {
    const mockDate = new Date(2024, 5, 16);
    const errorMessage = 'Network Error';
    apiClient.get.mockRejectedValueOnce({ message: errorMessage });

    await expect(getDailySchedule(mockDate)).rejects.toThrow(errorMessage);
  });

  test('handles API error with response data detail correctly', async () => {
    const mockDate = new Date(2024, 5, 16);
    const errorDetailMessage = 'Specific error from backend';
    apiClient.get.mockRejectedValueOnce({ response: { data: { detail: errorDetailMessage } } });

    await expect(getDailySchedule(mockDate)).rejects.toThrow(errorDetailMessage);
  });

  test('handles unexpected API response structure', async () => {
    const mockDate = new Date(2024, 5, 16);
    apiClient.get.mockResolvedValueOnce({ data: { some_other_structure: [] } }); // No professionals_schedule

    await expect(getDailySchedule(mockDate)).rejects.toThrow("Resposta da API em formato inesperado.");
  });
});
