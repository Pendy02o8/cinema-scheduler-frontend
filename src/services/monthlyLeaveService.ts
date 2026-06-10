import { monthlyLeaveApi } from '../api/monthlyLeaveApi';
import type { MonthlyLeavePayload } from '../types/monthlyLeave';

export const monthlyLeaveService = {
  getMonthlyLeaves() {
    return monthlyLeaveApi.getAll();
  },

  getMonthlyLeavesByEmployee(employeeId: number) {
    return monthlyLeaveApi.getByEmployee(employeeId);
  },

  getMonthlyLeavesByRange(startDate: string, endDate: string) {
    return monthlyLeaveApi.getByRange(startDate, endDate);
  },

  createMonthlyLeave(payload: MonthlyLeavePayload) {
    return monthlyLeaveApi.create(payload);
  },

  deleteMonthlyLeave(id: number) {
    return monthlyLeaveApi.remove(id);
  },
};
