export type WorkHourSummary = {
  employeeName: string;
  hours: string;
  rawText: string;
};

export type SingleEmployeeWorkHourSummary = {
  employeeName: string;
  startDate: string;
  endDate: string;
  hours: string;
  rawText: string;
};

export type WorkHourQuery = {
  startDate: string;
  endDate: string;
};
