export type StaffingCheckQuery = {
  date: string;
};

export type StaffingWeekCheckQuery = {
  startDate: string;
  endDate: string;
};

export type StaffingCheckResult = {
  id: string;
  date?: string;
  position: string;
  period: string;
  message: string;
  rawText: string;
};
