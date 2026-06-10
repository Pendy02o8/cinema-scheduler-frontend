import type { Employee } from './employee';

export type MonthlyLeave = {
  id: number;
  employee: Employee;
  leaveDate: string;
  note?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type MonthlyLeavePayload = {
  employee: Pick<Employee, 'id'>;
  leaveDate: string;
  note?: string;
};
