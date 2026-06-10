import type { Employee } from './employee';

export type AvailabilityType = 'BEFORE' | 'AFTER' | 'UNAVAILABLE' | 'ALL_DAY';

export type WeeklyScheduleSummary = {
  id: number;
  weekStartDate?: string;
  weekEndDate?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
};

export type Availability = {
  id: number;
  employee: Employee;
  weeklySchedule?: WeeklyScheduleSummary | null;
  date: string;
  availabilityType: AvailabilityType | string;
  boundaryTime?: string | null;
  note?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type AvailabilityPayload = {
  employee: Pick<Employee, 'id'>;
  weeklySchedule?: Pick<WeeklyScheduleSummary, 'id'> | null;
  date: string;
  availabilityType: AvailabilityType;
  boundaryTime?: string | null;
  note?: string;
};
