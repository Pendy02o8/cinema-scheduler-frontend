export type Employee = {
  id: number;
  name: string;
  jobTitle: string;
  isActive: boolean;
  note?: string | null;
  sortOrder?: number;
  requiresPositionAssignment?: boolean;
  requiresMonthlyLeave?: boolean;
  createdAt?: string;
  updatedAt?: string;
  employeeType?: 'PART_TIME' | 'FULL_TIME' | 'CLEANER' | null;
  fixedShiftType?: 'MORNING' | 'EVENING' | 'NONE' | null;
};

export type EmployeePayload = {
  name: string;
  jobTitle: string;
  isActive: boolean;
  note?: string;
  sortOrder?: number;
  requiresPositionAssignment?: boolean;
  requiresMonthlyLeave?: boolean;
  employeeType?: 'PART_TIME' | 'FULL_TIME' | 'CLEANER' | null;
  fixedShiftType?: 'MORNING' | 'EVENING' | 'NONE' | null;
};

export type EmployeeSortOrderPayload = {
  id: number;
  sortOrder: number;
};
