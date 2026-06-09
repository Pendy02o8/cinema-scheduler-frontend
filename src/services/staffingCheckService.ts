import { staffingCheckApi } from '../api/staffingCheckApi';
import type {
  StaffingCheckResult,
  StaffingWeekCheckQuery,
} from '../types/staffingCheck';

function parseResult(rawText: string, index: number): StaffingCheckResult {
  const dateMatch = rawText.match(/^(\d{4}-\d{2}-\d{2})\s+[^：:]+[：:]\s*(.*)$/);
  const date = dateMatch?.[1];
  const body = dateMatch?.[2] ?? rawText;
  const detailMatch = body.match(/^(.*?)\s+(\d{2}:\d{2}~\d{2}:\d{2})\s*(.*)$/);

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
    period: detailMatch[2],
    message: detailMatch[3].trim() || rawText,
    rawText,
  };
}

function parseResults(rawResults: string[]) {
  return rawResults.map(parseResult);
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
    return parseResults(results);
  },
};
