import type { Employee } from './employee';
import type { Position } from './position';
import type { WeeklySchedule } from './weeklySchedule';

export type ScheduleAssignment = {
  id: number;
  weeklySchedule?: WeeklySchedule | null;
  employee: Employee;
  position?: Position | null;
  date: string;
  startTime: string;
  endTime: string;
  note?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type ScheduleAssignmentPayload = {
  weeklySchedule?: Pick<WeeklySchedule, 'id'> | null;
  employee: Pick<Employee, 'id'>;
  position?: Pick<Position, 'id'> | null;
  date: string;
  startTime: string;
  endTime: string;
  note?: string;
};
