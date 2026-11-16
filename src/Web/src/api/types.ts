export interface Service {
  id: number;
  name: string;
  durationMinutes: number;
  price: number;
}

export interface TimeSlot {
  /** ISO 8601 en UTC */
  startAt: string;
  /** ISO 8601 en UTC */
  endAt: string;
  /** Hora local del negocio, p. ej. "09:00" */
  startTime: string;
  endTime: string;
  label: string;
}

export type DayStatus = 'Open' | 'Closed' | 'Past';

export interface Availability {
  dayStatus: DayStatus;
  slots: TimeSlot[];
}

export type BookingStatus = 'Confirmed' | 'Cancelled';

export interface Booking {
  id: string;
  serviceId: number;
  serviceName: string;
  serviceDurationMinutes: number;
  servicePrice: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  startAt: string;
  endAt: string;
  localDate: string;
  localStartTime: string;
  localEndTime: string;
  status: BookingStatus;
  cancelToken: string;
  cancelUrl: string;
}

export interface CreateBookingPayload {
  serviceId: number;
  startAt: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
}
