export type WeeklyScheduleStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export type WeeklySchedule = {
  id: number;
  weekStartDate: string;
  weekEndDate: string;
  status: WeeklyScheduleStatus | string;
  createdAt?: string;
  updatedAt?: string;
};

export type WeeklySchedulePayload = {
  weekStartDate: string;
  weekEndDate: string;
  status: WeeklyScheduleStatus;
};
