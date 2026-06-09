import httpClient from './httpClient';
import type { StaffingWeekCheckQuery } from '../types/staffingCheck';

const scheduleAssignmentPath = '/schedule-assignments';

export const staffingCheckApi = {
  async getUnderstaffingByDate(date: string) {
    const response = await httpClient.get<string[]>(`${scheduleAssignmentPath}/check-gaps/${date}`);
    return response.data;
  },

  async getUnderstaffingByWeek(query: StaffingWeekCheckQuery) {
    const response = await httpClient.get<string[]>(`${scheduleAssignmentPath}/check-schedule/week`, {
      params: query,
    });
    return response.data;
  },

  async getOverstaffingByDate(date: string) {
    const response = await httpClient.get<string[]>(
      `${scheduleAssignmentPath}/check-overstaffed/${date}`,
    );
    return response.data;
  },
};
