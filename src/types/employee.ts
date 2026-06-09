export type Employee = {
  id: number;
  name: string;
  jobTitle: string;
  isActive: boolean;
  note?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type EmployeePayload = {
  name: string;
  jobTitle: string;
  isActive: boolean;
  note?: string;
};
