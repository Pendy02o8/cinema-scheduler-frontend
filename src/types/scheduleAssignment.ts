export type ScheduleAssignment = {
  id: number;
  weeklyScheduleId?: number | null;
  employeeId: number;
  employeeName: string;
  positionId?: number | null;
  positionName?: string | null;
  date: string;
  startTime: string;
  endTime: string;
  note?: string | null;
};

export type ScheduleAssignmentPayload = {
  weeklyScheduleId: number | null;
  employeeId: number;
  positionId: number | null;
  date: string;
  startTime: string;
  endTime: string;
  note?: string | null;
};

export type ScheduleAssignmentMutationResponse = {
  data: ScheduleAssignment;
  warnings: string[];
};

export type ScheduleAssignmentValidationResult = {
  warnings?: string[];
  errors?: string[] | Record<string, string | string[]>;
  message?: string;
};

export type ScheduleAssignmentChangeType = 'CREATED' | 'UPDATED' | 'DELETED';

export type ScheduleAssignmentChange = {
  id: number;
  weeklyScheduleId?: number | null;
  employeeId: number;
  employeeName: string;
  date: string;
  changeType: ScheduleAssignmentChangeType;
  createdAt?: string | null;
};
