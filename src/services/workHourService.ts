import { workHourApi } from '../api/workHourApi';
import type {
  SingleEmployeeWorkHourSummary,
  WorkHourQuery,
  WorkHourSummary,
} from '../types/workHour';

function parseAllSummary(summary: string): WorkHourSummary {
  const match =
    summary.match(/^(.*?)\s+\d{4}-\d{2}-\d{2}~\d{4}-\d{2}-\d{2}\s+工時[：:]\s*([\d.]+)\s*小時/)
    ?? summary.match(/^(.*?)[：:]\s*([\d.]+)\s*小時/);

  if (!match) {
    return {
      employeeName: summary,
      hours: '-',
      rawText: summary,
    };
  }

  return {
    employeeName: match[1],
    hours: match[2],
    rawText: summary,
  };
}

function parseSingleSummary(summary: string): SingleEmployeeWorkHourSummary {
  const match = summary.match(/^(.*?)\s+(\d{4}-\d{2}-\d{2})~(\d{4}-\d{2}-\d{2})\s+工時[：:]\s*([\d.]+)\s*小時/);

  if (!match) {
    const compactMatch = summary.match(/^(.*?)[：:]\s*([\d.]+)\s*小時/);

    if (compactMatch) {
      return {
        employeeName: compactMatch[1],
        startDate: '',
        endDate: '',
        hours: compactMatch[2],
        rawText: summary,
      };
    }

    return {
      employeeName: '-',
      startDate: '',
      endDate: '',
      hours: '-',
      rawText: summary,
    };
  }

  return {
    employeeName: match[1],
    startDate: match[2],
    endDate: match[3],
    hours: match[4],
    rawText: summary,
  };
}

export const workHourService = {
  async getAllSummaries(query: WorkHourQuery) {
    const summaries = await workHourApi.getAll(query);
    return summaries.map(parseAllSummary);
  },

  async getEmployeeSummary(employeeId: number, query: WorkHourQuery) {
    const summary = await workHourApi.getByEmployee(employeeId, query);
    return parseSingleSummary(summary);
  },
};
