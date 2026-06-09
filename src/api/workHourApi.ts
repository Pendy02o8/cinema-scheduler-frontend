import httpClient from './httpClient';
import type { WorkHourQuery } from '../types/workHour';

const workHoursPath = '/schedule-assignments/work-hours';

export const workHourApi = {
  async getAll(query: WorkHourQuery) {
    const response = await httpClient.get<string[]>(`${workHoursPath}/all`, {
      params: query,
    });
    return response.data;
  },

  async getByEmployee(employeeId: number, query: WorkHourQuery) {
    const response = await httpClient.get<string>(`${workHoursPath}/employee/${employeeId}`, {
      params: query,
      responseType: 'text',
    });
    return response.data;
  },
};
