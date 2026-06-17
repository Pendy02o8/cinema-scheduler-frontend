import type { Employee } from '../types/employee';

const defaultEmployeeSortOrder = 9999;

export function sortEmployeesBySortOrder<T extends Pick<Employee, 'id' | 'sortOrder'>>(
  employees: T[],
) {
  return [...employees].sort((firstEmployee, secondEmployee) => {
    const firstSortOrder = firstEmployee.sortOrder ?? defaultEmployeeSortOrder;
    const secondSortOrder = secondEmployee.sortOrder ?? defaultEmployeeSortOrder;

    if (firstSortOrder !== secondSortOrder) {
      return firstSortOrder - secondSortOrder;
    }

    return firstEmployee.id - secondEmployee.id;
  });
}
