import { scheduleAssignmentApi } from '../api/scheduleAssignmentApi';
import type { ScheduleAssignmentPayload } from '../types/scheduleAssignment';

export const scheduleAssignmentService = {
  getScheduleAssignments() {
    return scheduleAssignmentApi.getAll();
  },

  getScheduleAssignment(id: number) {
    return scheduleAssignmentApi.getById(id);
  },

  getScheduleAssignmentsByDate(date: string) {
    return scheduleAssignmentApi.getByDate(date);
  },

  getScheduleAssignmentsByEmployee(employeeId: number) {
    return scheduleAssignmentApi.getByEmployee(employeeId);
  },

  getScheduleAssignmentsByPosition(positionId: number) {
    return scheduleAssignmentApi.getByPosition(positionId);
  },

  getScheduleAssignmentsByWeek(startDate: string, endDate: string) {
    return scheduleAssignmentApi.getByWeek(startDate, endDate);
  },

  createScheduleAssignment(payload: ScheduleAssignmentPayload) {
    return scheduleAssignmentApi.create(payload);
  },

  validateScheduleAssignment(payload: ScheduleAssignmentPayload) {
    return scheduleAssignmentApi.validate(payload);
  },

  updateScheduleAssignment(id: number, payload: ScheduleAssignmentPayload) {
    return scheduleAssignmentApi.update(id, payload);
  },

  deleteScheduleAssignment(id: number) {
    return scheduleAssignmentApi.remove(id);
  },

  generateFixedAssignments(weeklyScheduleId: number, startDate: string, endDate: string) {
    return scheduleAssignmentApi.generateFixed(weeklyScheduleId, startDate, endDate);
  },

  getScheduleAssignmentChangesByWeeklyScheduleId(weeklyScheduleId: number) {
    return scheduleAssignmentApi.getScheduleAssignmentChangesByWeeklyScheduleId(weeklyScheduleId);
  },
};
