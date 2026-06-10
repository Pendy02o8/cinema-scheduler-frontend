import httpClient from './httpClient';
import type {
  ScheduleAssignment,
  ScheduleAssignmentPayload,
} from '../types/scheduleAssignment';

const scheduleAssignmentPath = '/schedule-assignments';

export const scheduleAssignmentApi = {
  async getAll() {
    const response = await httpClient.get<ScheduleAssignment[]>(scheduleAssignmentPath);
    return response.data;
  },

  async create(payload: ScheduleAssignmentPayload) {
    const response = await httpClient.post<ScheduleAssignment>(scheduleAssignmentPath, payload);
    return response.data;
  },

  async update(id: number, payload: ScheduleAssignmentPayload) {
    const response = await httpClient.put<ScheduleAssignment>(
      `${scheduleAssignmentPath}/${id}`,
      payload,
    );
    return response.data;
  },

  async remove(id: number) {
    await httpClient.delete(`${scheduleAssignmentPath}/${id}`);
  },

  async generateFixed(weeklyScheduleId: number, startDate: string, endDate: string) {
    const response = await httpClient.post<string>(`${scheduleAssignmentPath}/generate-fixed`, null, {
      params: {
        weeklyScheduleId,
        startDate,
        endDate,
      },
    });
    return response.data;
  },
};
