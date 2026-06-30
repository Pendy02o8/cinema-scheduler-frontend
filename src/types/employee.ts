export type Employee = {
  id: number;
  name: string;
  jobTitle: string;
  isActive: boolean;
  note?: string | null;
  employeeType?: 'PART_TIME' | 'FULL_TIME' | 'CLEANER' | null;
  fixedShiftType?: 'MORNING' | 'EVENING' | 'NONE' | null;
  sortOrder?: number;
  requiresPositionAssignment?: boolean;
  requiresMonthlyLeave?: boolean;
};

export type EmployeePayload = {
  name: string;
  jobTitle: string;
  isActive: boolean;
  note?: string | null;
  employeeType?: 'PART_TIME' | 'FULL_TIME' | 'CLEANER' | null;
  fixedShiftType?: 'MORNING' | 'EVENING' | 'NONE' | null;
  sortOrder: number;
  requiresPositionAssignment: boolean;
  requiresMonthlyLeave: boolean;
};

export type EmployeeSortOrderPayload = {
  id: number;
  sortOrder: number;
};
