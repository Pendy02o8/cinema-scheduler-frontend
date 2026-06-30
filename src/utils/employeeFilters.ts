import type { Employee } from '../types/employee';

type EmployeeActiveStatus = Pick<Employee, 'isActive'>;
type EmployeePartTimeStatus = Pick<Employee, 'employeeType' | 'jobTitle'>;

export function isActiveEmployee(employee: EmployeeActiveStatus) {
  return employee.isActive;
}

export function isPartTimeEmployee(employee: EmployeePartTimeStatus) {
  return employee.employeeType === 'PART_TIME' || employee.jobTitle.includes('工讀生');
}

export function getActiveEmployees<T extends EmployeeActiveStatus>(employees: T[]) {
  return employees.filter(isActiveEmployee);
}

export function getActivePartTimeEmployees<T extends EmployeeActiveStatus & EmployeePartTimeStatus>(
  employees: T[],
) {
  return employees.filter((employee) => isActiveEmployee(employee) && isPartTimeEmployee(employee));
}
