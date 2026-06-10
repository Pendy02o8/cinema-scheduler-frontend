export type Employee = {
  id: number;
  name: string;
  jobTitle: string;
  isActive: boolean;
  note?: string | null;
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
  employeeType?: 'PART_TIME' | 'FULL_TIME' | 'CLEANER' | null;
  fixedShiftType?: 'MORNING' | 'EVENING' | 'NONE' | null;
};
