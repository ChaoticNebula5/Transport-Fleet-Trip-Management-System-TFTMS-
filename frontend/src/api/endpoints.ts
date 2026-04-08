import client from './client'

/* ---- Auth ---- */

export const authApi = {
  login: (email: string, password: string) =>
    client.post<{ access_token: string; token_type: string }>('/auth/login', { email, password }),

  register: (email: string, password: string, role: string, fullName: string) =>
    client.post('/auth/register', { email, password, role, full_name: fullName }),

  me: () =>
    client.get<{ user_id: number; email: string; full_name: string; role: string }>('/me'),

  listUsers: (page = 1, limit = 50) =>
    client.get('/auth/users', { params: { page, limit } }),

  updateUser: (userId: number, data: { role?: string; is_active?: boolean; full_name?: string }) =>
    client.patch(`/auth/users/${userId}`, data),
}

/* ---- Trips ---- */

export interface TripRow {
  trip_id: number
  route_id: number
  vehicle_id: number
  driver_staff_id: number
  conductor_staff_id: number | null
  trip_date: string
  shift: string
  status: string
  actual_start_time: string | null
  actual_end_time_claimed: string | null
  odometer_start_claimed: number | null
  odometer_end_claimed: number | null
}

export const tripsApi = {
  list: (params: { page?: number; limit?: number; status?: string }) =>
    client.get<{ success: boolean; page: number; limit: number; total: number; data: TripRow[] }>(
      '/trips', { params }
    ),

  create: (data: {
    route_id: number
    vehicle_id: number
    driver_staff_id: number
    conductor_staff_id?: number | null
    trip_date: string
    shift: string
  }) => client.post('/trips', data),

  lookupRoutes: () =>
    client.get<{ route_id: number; route_code: string; route_name: string; start_point: string; end_point: string }[]>(
      '/trips/lookup/routes'
    ),

  lookupVehicles: () =>
    client.get<{ vehicle_id: number; registration_no: string; model: string; capacity: number }[]>(
      '/trips/lookup/vehicles'
    ),

  lookupStaff: (staffType?: string) =>
    client.get<{ staff_id: number; full_name: string; staff_type: string; license_no: string }[]>(
      '/trips/lookup/staff', { params: staffType ? { staff_type: staffType } : {} }
    ),

  start: (tripId: number, odometerStart: number) =>
    client.post(`/trips/${tripId}/start`, null, { params: { odometer_start: odometerStart } }),

  requestEnd: (tripId: number, odometerEnd: number) =>
    client.post(`/trips/${tripId}/request-end`, null, { params: { odometer_end: odometerEnd } }),

  verify: (tripId: number, odometerEndVerified: number) =>
    client.post(`/trips/${tripId}/verify`, null, { params: { odometer_end_verified: odometerEndVerified } }),

  cancel: (tripId: number) =>
    client.post(`/trips/${tripId}/cancel`),

  reportIncident: (tripId: number, severity: string, category: string, description: string) =>
    client.post(`/trips/${tripId}/incident`, null, {
      params: { severity, category, description },
    }),
}

/* ---- Reports ---- */

export const reportsApi = {
  tripSummary: (params: {
    start_date?: string
    end_date?: string
    status?: string
    page?: number
    limit?: number
  }) => client.get('/reports/trip-summary', { params }),

  vehicleUtilization: (page = 1, limit = 20) =>
    client.get('/reports/vehicle-utilization', { params: { page, limit } }),

  incidentSummary: (params: { severity?: string; page?: number; limit?: number }) =>
    client.get('/reports/incident-summary', { params }),
}
