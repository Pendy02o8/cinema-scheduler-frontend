import { weeklyScheduleApi } from '../api/weeklyScheduleApi';
import type { WeeklySchedule, WeeklySchedulePayload } from '../types/weeklySchedule';

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

  publishWeeklySchedule(schedule: WeeklySchedule) {
    return weeklyScheduleApi.publishWeeklySchedule(schedule);
  },

  deleteWeeklySchedule(id: number) {
    return weeklyScheduleApi.remove(id);
  },
};
