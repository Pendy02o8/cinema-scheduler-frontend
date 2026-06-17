import type { Employee } from '../types/employee';

type EmployeeActiveStatus = Pick<Employee, 'isActive'>;

export function isActiveEmployee(employee: EmployeeActiveStatus) {
  return employee.isActive;
}

export function getActiveEmployees<T extends EmployeeActiveStatus>(employees: T[]) {
  return employees.filter(isActiveEmployee);
}
