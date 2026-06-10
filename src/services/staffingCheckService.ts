import { staffingCheckApi } from '../api/staffingCheckApi';
import type {
  StaffingCheckResult,
  StaffingWeekCheckQuery,
} from '../types/staffingCheck';

function formatDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDatesBetween(startDate: string, endDate: string) {
  const dates: string[] = [];
  const currentDate = new Date(`${startDate}T00:00:00`);
  const finalDate = new Date(`${endDate}T00:00:00`);

  while (currentDate <= finalDate) {
    dates.push(formatDateValue(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
}

function parseResult(rawText: string, index: number, fallbackDate?: string): StaffingCheckResult {
  const dateMatch = rawText.match(/^(\d{4}-\d{2}-\d{2})\s+[^：:]+[：:]\s*(.*)$/);
  const date = dateMatch?.[1] ?? fallbackDate;
  const body = dateMatch?.[2] ?? rawText;
  const detailMatch = body.match(/^(.*?)\s+(\d{2}:\d{2})\s*[~-]\s*(\d{2}:\d{2})\s*(.*)$/);

  if (!detailMatch) {
    return {
      id: `${index}-${rawText}`,
      date,
      position: body,
      period: '-',
      message: body,
      rawText,
    };
  }

  return {
    id: `${index}-${rawText}`,
    date,
    position: detailMatch[1].trim(),
    period: `${detailMatch[2]}~${detailMatch[3]}`,
    message: detailMatch[4].trim() || rawText,
    rawText,
  };
}

function parseResults(rawResults: string[]) {
  return rawResults.map((result, index) => parseResult(result, index));
}

function parseResultsForDate(rawResults: string[], date: string) {
  return rawResults.map((result, index) => parseResult(result, index, date));
}

export const staffingCheckService = {
  async getUnderstaffingByDate(date: string) {
    const results = await staffingCheckApi.getUnderstaffingByDate(date);
    return parseResults(results);
  },

  async getUnderstaffingByWeek(query: StaffingWeekCheckQuery) {
    const results = await staffingCheckApi.getUnderstaffingByWeek(query);
    return parseResults(results);
  },

  async getOverstaffingByDate(date: string) {
    const results = await staffingCheckApi.getOverstaffingByDate(date);
    return parseResultsForDate(results, date);
  },

  async getOverstaffingByWeek(query: StaffingWeekCheckQuery) {
    const dates = getDatesBetween(query.startDate, query.endDate);
    const dailyResults = await Promise.all(
      dates.map(async (date) => {
        const results = await staffingCheckApi.getOverstaffingByDate(date);
        return parseResultsForDate(results, date);
      }),
    );

    return dailyResults.flat();
  },
};
