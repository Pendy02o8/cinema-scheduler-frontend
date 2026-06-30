import httpClient from './httpClient';
import type { Availability, AvailabilityPayload } from '../types/availability';

const availabilityPath = '/availability';

export const availabilityApi = {
  async getAll() {
    const response = await httpClient.get<Availability[]>(availabilityPath);
    return response.data;
  },

  async getById(id: number) {
    const response = await httpClient.get<Availability>(`${availabilityPath}/${id}`);
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

  async importExcel(file: File, weeklyScheduleId: number) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('weeklyScheduleId', String(weeklyScheduleId));

    const response = await httpClient.post<string>(`${availabilityPath}/import`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};
