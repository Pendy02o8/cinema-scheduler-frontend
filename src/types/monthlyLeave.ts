import type { Employee } from './employee';

export type LeaveType = 'REGULAR_LEAVE' | 'ANNUAL_LEAVE';

export type MonthlyLeave = {
  id: number;
  employee: Employee;
  leaveDate: string;
  leaveType?: LeaveType | null;
  note?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type MonthlyLeavePayload = {
  employeeId: number;
  leaveDate: string;
  leaveType: LeaveType;
  note?: string | null;
};

export type MonthlyLeaveSummary = {
  employeeId: number;
  employeeName: string;
  jobTitle: string;
  leaveDays: number;
  leaveDates: string[];
  regularLeaveDays?: number;
  annualLeaveDays?: number;
  totalLeaveDays?: number;
  regularLeaveDates?: string[];
  annualLeaveDates?: string[];
};
