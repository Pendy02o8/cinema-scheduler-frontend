import { monthlyLeaveApi } from '../api/monthlyLeaveApi';
import type { LeaveType, MonthlyLeavePayload } from '../types/monthlyLeave';
import { defaultLeaveType } from '../utils/leaveType';

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

  getMonthlyLeaveSummary(year: number, month: number) {
    return monthlyLeaveApi.getSummary(year, month);
  },

  createMonthlyLeave(
    employeeId: number,
    leaveDate: string,
    leaveType: LeaveType = defaultLeaveType,
  ) {
    return monthlyLeaveApi.createForEmployee(employeeId, leaveDate, leaveType);
  },

  createMonthlyLeaveWithPayload(payload: MonthlyLeavePayload) {
    return monthlyLeaveApi.create(payload);
  },

  updateMonthlyLeave(id: number, payload: MonthlyLeavePayload) {
    return monthlyLeaveApi.update(id, payload);
  },

  deleteMonthlyLeave(id: number) {
    return monthlyLeaveApi.remove(id);
  },
};
