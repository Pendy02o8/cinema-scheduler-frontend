import httpClient from './httpClient';
import type {
  LeaveType,
  MonthlyLeave,
  MonthlyLeavePayload,
  MonthlyLeaveSummary,
} from '../types/monthlyLeave';

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

  async getSummary(year: number, month: number) {
    const response = await httpClient.get<MonthlyLeaveSummary[]>(`${monthlyLeavePath}/summary`, {
      params: { year, month },
    });
    return response.data;
  },

  async create(payload: MonthlyLeavePayload) {
    const response = await httpClient.post<MonthlyLeave>(monthlyLeavePath, payload);
    return response.data;
  },

  async createForEmployee(employeeId: number, leaveDate: string, leaveType: LeaveType) {
    const response = await httpClient.post<MonthlyLeave>(monthlyLeavePath, {
      employeeId,
      leaveDate,
      leaveType,
    });
    return response.data;
  },

  async update(id: number, payload: MonthlyLeavePayload) {
    const response = await httpClient.put<MonthlyLeave>(`${monthlyLeavePath}/${id}`, payload);
    return response.data;
  },

  async remove(id: number) {
    await httpClient.delete(`${monthlyLeavePath}/${id}`);
  },
};
