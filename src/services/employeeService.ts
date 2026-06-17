import { employeeApi } from '../api/employeeApi';
import type { EmployeePayload, EmployeeSortOrderPayload } from '../types/employee';

export const employeeService = {
  getEmployees() {
    return employeeApi.getAll();
  },

  getEmployee(id: number) {
    return employeeApi.getById(id);
  },

  createEmployee(payload: EmployeePayload) {
    return employeeApi.create(payload);
  },

  updateEmployee(id: number, payload: EmployeePayload) {
    return employeeApi.update(id, payload);
  },

  updateEmployeeSortOrder(payload: EmployeeSortOrderPayload[]) {
    return employeeApi.updateSortOrder(payload);
  },

  deleteEmployee(id: number) {
    return employeeApi.remove(id);
  },
};
