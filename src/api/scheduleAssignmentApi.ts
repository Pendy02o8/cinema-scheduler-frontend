import httpClient from './httpClient';
import type {
  ScheduleAssignment,
  ScheduleAssignmentChange,
  ScheduleAssignmentMutationResponse,
  ScheduleAssignmentPayload,
  ScheduleAssignmentValidationResult,
} from '../types/scheduleAssignment';

const scheduleAssignmentPath = '/schedule-assignments';
const scheduleAssignmentChangePath = '/schedule-assignment-changes';

function hasValidationWarnings(data: unknown): data is ScheduleAssignmentValidationResult {
  if (typeof data !== 'object' || data === null || !('warnings' in data)) {
    return false;
  }

  const warnings = (data as ScheduleAssignmentValidationResult).warnings;
  return Array.isArray(warnings) && warnings.length > 0;
}

export const scheduleAssignmentApi = {
  async getAll() {
    const response = await httpClient.get<ScheduleAssignment[]>(scheduleAssignmentPath);
    return response.data;
  },

  async getById(id: number) {
    const response = await httpClient.get<ScheduleAssignment>(`${scheduleAssignmentPath}/${id}`);
    return response.data;
  },

  async getByDate(date: string) {
    const response = await httpClient.get<ScheduleAssignment[]>(
      `${scheduleAssignmentPath}/date/${date}`,
    );
    return response.data;
  },

  async getByEmployee(employeeId: number) {
    const response = await httpClient.get<ScheduleAssignment[]>(
      `${scheduleAssignmentPath}/employee/${employeeId}`,
    );
    return response.data;
  },

  async getByPosition(positionId: number) {
    const response = await httpClient.get<ScheduleAssignment[]>(
      `${scheduleAssignmentPath}/position/${positionId}`,
    );
    return response.data;
  },

  async getByWeek(startDate: string, endDate: string) {
    const response = await httpClient.get<ScheduleAssignment[]>(`${scheduleAssignmentPath}/week`, {
      params: {
        startDate,
        endDate,
      },
    });
    return response.data;
  },

  async create(payload: ScheduleAssignmentPayload) {
    const response = await httpClient.post<ScheduleAssignmentMutationResponse>(
      scheduleAssignmentPath,
      payload,
    );
    return response.data;
  },

  async validate(payload: ScheduleAssignmentPayload) {
    try {
      const response = await httpClient.post<ScheduleAssignmentValidationResult>(
        `${scheduleAssignmentPath}/validate`,
        payload,
      );
      return response.data;
    } catch (error) {
      if (
        typeof error === 'object'
        && error !== null
        && 'response' in error
        && typeof error.response === 'object'
        && error.response !== null
        && 'data' in error.response
        && hasValidationWarnings(error.response.data)
      ) {
        return error.response.data;
      }

      throw error;
    }
  },

  async update(id: number, payload: ScheduleAssignmentPayload) {
    const response = await httpClient.put<ScheduleAssignmentMutationResponse>(
      `${scheduleAssignmentPath}/${id}`,
      payload,
    );
    return response.data;
  },

  async remove(id: number) {
    await httpClient.delete(`${scheduleAssignmentPath}/${id}`);
  },

  async generateFixed(weeklyScheduleId: number, startDate: string, endDate: string) {
    const response = await httpClient.post<ScheduleAssignment | ScheduleAssignment[]>(
      `${scheduleAssignmentPath}/generate-fixed`,
      null,
      {
        params: {
          weeklyScheduleId,
          startDate,
          endDate,
        },
      },
    );
    return response.data;
  },

  async getScheduleAssignmentChangesByWeeklyScheduleId(weeklyScheduleId: number) {
    const response = await httpClient.get<ScheduleAssignmentChange[]>(
      `${scheduleAssignmentChangePath}/weekly-schedule/${weeklyScheduleId}`,
    );
    return response.data;
  },
};
