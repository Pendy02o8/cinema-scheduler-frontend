import httpClient from './httpClient';
import type { WeeklySchedule, WeeklySchedulePayload } from '../types/weeklySchedule';

const weeklySchedulePath = '/weeklySchedule';

export const weeklyScheduleApi = {
  async getAll() {
    const response = await httpClient.get<WeeklySchedule[]>(weeklySchedulePath);
    return response.data;
  },

  async create(payload: WeeklySchedulePayload) {
    const response = await httpClient.post<WeeklySchedule>(weeklySchedulePath, payload);
    return response.data;
  },

  async update(id: number, payload: WeeklySchedulePayload) {
    const response = await httpClient.put<WeeklySchedule>(`${weeklySchedulePath}/${id}`, payload);
    return response.data;
  },

  async remove(id: number) {
    await httpClient.delete(`${weeklySchedulePath}/${id}`);
  },
};
