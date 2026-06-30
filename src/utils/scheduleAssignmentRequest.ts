import type { ScheduleAssignmentPayload } from '../types/scheduleAssignment';

type ScheduleAssignmentRequestSource = {
  weeklyScheduleId?: number | string | null;
  employeeId: number | string;
  positionId?: number | string | null;
  date: string;
  startTime: string;
  endTime: string;
  note?: string | null;
};

function toOptionalId(value: number | string | null | undefined) {
  const id = Number(value);
  return id > 0 ? id : null;
}

export function buildScheduleAssignmentRequest(
  source: ScheduleAssignmentRequestSource,
): ScheduleAssignmentPayload {
  return {
    weeklyScheduleId: toOptionalId(source.weeklyScheduleId),
    employeeId: Number(source.employeeId),
    positionId: toOptionalId(source.positionId),
    date: source.date,
    startTime: source.startTime,
    endTime: source.endTime,
    note: source.note ?? '',
  };
}
