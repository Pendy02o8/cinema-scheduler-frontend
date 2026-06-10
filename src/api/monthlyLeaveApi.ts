import httpClient from './httpClient';
import type { MonthlyLeave, MonthlyLeavePayload } from '../types/monthlyLeave';

const monthlyLeavePath = '/monthly-leaves';

export const monthlyLeaveApi = {
  async getAll() {
    const response = await httpClient.get<MonthlyLeave[]>(monthlyLeavePath);
    return response.data;
  },

  async getByEmployee(employeeId: number) {
    const response = await httpClient.get<MonthlyLeave[]>(
      `${monthlyLeavePath}/employee/${employeeId}`,
    );
    return response.data;
  },

  async getByRange(startDate: string, endDate: string) {
    const response = await httpClient.get<MonthlyLeave[]>(`${monthlyLeavePath}/range`, {
      params: { startDate, endDate },
    });
    return response.data;
  },

  async create(payload: MonthlyLeavePayload) {
    const response = await httpClient.post<MonthlyLeave>(monthlyLeavePath, payload);
    return response.data;
  },

  async remove(id: number) {
    await httpClient.delete(`${monthlyLeavePath}/${id}`);
  },
};
