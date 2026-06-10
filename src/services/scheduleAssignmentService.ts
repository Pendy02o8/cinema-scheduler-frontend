import { scheduleAssignmentApi } from '../api/scheduleAssignmentApi';
import type { ScheduleAssignmentPayload } from '../types/scheduleAssignment';

export const scheduleAssignmentService = {
  getScheduleAssignments() {
    return scheduleAssignmentApi.getAll();
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
};
