export type AvailabilityType = 'BEFORE' | 'AFTER' | 'UNAVAILABLE' | 'ALL_DAY';

export type Availability = {
  id: number;
  employeeId: number;
  employeeName: string;
  weeklyScheduleId?: number | null;
  date: string;
  availabilityType: AvailabilityType | string;
  boundaryTime?: string | null;
  note?: string | null;
};

export type AvailabilityPayload = {
  employeeId: number;
  weeklyScheduleId?: number | null;
  date: string;
  availabilityType: AvailabilityType;
  boundaryTime?: string | null;
  note?: string | null;
};
