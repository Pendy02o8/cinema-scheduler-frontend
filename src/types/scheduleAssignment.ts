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

export type ScheduleAssignmentValidationResult = {
  warnings?: string[];
  errors?: string[];
  message?: string;
};

export type ScheduleAssignmentChangeType = 'CREATED' | 'UPDATED' | 'DELETED';

export type ScheduleAssignmentChange = {
  id: number;
  weeklySchedule?: Pick<WeeklySchedule, 'id'> | null;
  employee: Pick<Employee, 'id' | 'name'>;
  date: string;
  changeType: ScheduleAssignmentChangeType;
  createdAt?: string | null;
};
