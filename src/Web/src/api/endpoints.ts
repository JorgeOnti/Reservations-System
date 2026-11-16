import { request } from './client';
import type {
  Availability,
  Booking,
  CreateBookingPayload,
  DayStatus,
  Service,
  TimeSlot,
} from './types';

const DAY_STATUSES: readonly DayStatus[] = ['Open', 'Closed', 'Past'];

export const api = {
  async getServices(signal?: AbortSignal): Promise<Service[]> {
    const { data } = await request<Service[]>('/api/services', { signal });
    return data ?? [];
  },

  async getAvailability(serviceId: number, date: string, signal?: AbortSignal): Promise<Availability> {
    const params = new URLSearchParams({ serviceId: String(serviceId), date });
    const { data, headers } = await request<TimeSlot[]>(`/api/availability?${params}`, { signal });
    const header = headers.get('X-Day-Status') as DayStatus | null;
    return {
      dayStatus: header && DAY_STATUSES.includes(header) ? header : 'Open',
      slots: data ?? [],
    };
  },

  async getBookings(date: string, signal?: AbortSignal): Promise<Booking[]> {
    const params = new URLSearchParams({ date });
    const { data } = await request<Booking[]>(`/api/bookings?${params}`, { signal });
    return data ?? [];
  },

  async createBooking(payload: CreateBookingPayload): Promise<Booking> {
    const { data } = await request<Booking>('/api/bookings', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return data;
  },

  async cancelBooking(id: string, token: string): Promise<Booking> {
    const { data } = await request<Booking>(`/api/bookings/${encodeURIComponent(id)}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
    return data;
  },
};
