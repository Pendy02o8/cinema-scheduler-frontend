import { weeklyScheduleApi } from '../api/weeklyScheduleApi';
import type { WeeklySchedulePayload } from '../types/weeklySchedule';

export const weeklyScheduleService = {
  getWeeklySchedules() {
    return weeklyScheduleApi.getAll();
  },

  createWeeklySchedule(payload: WeeklySchedulePayload) {
    return weeklyScheduleApi.create(payload);
  },

  updateWeeklySchedule(id: number, payload: WeeklySchedulePayload) {
    return weeklyScheduleApi.update(id, payload);
  },

  deleteWeeklySchedule(id: number) {
    return weeklyScheduleApi.remove(id);
  },
};
