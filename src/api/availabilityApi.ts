import httpClient from './httpClient';
import type { Availability, AvailabilityPayload } from '../types/availability';

const availabilityPath = '/availability';

export const availabilityApi = {
  async getAll() {
    const response = await httpClient.get<Availability[]>(availabilityPath);
    return response.data;
  },

  async getByEmployee(employeeId: number) {
    const response = await httpClient.get<Availability[]>(`${availabilityPath}/employee/${employeeId}`);
    return response.data;
  },

  async create(payload: AvailabilityPayload) {
    const response = await httpClient.post<Availability>(availabilityPath, payload);
    return response.data;
  },

  async update(id: number, payload: AvailabilityPayload) {
    const response = await httpClient.put<Availability>(`${availabilityPath}/${id}`, payload);
    return response.data;
  },

  async remove(id: number) {
    await httpClient.delete(`${availabilityPath}/${id}`);
  },
};
