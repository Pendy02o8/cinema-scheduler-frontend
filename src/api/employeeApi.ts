import httpClient from './httpClient';
import type { Employee, EmployeePayload } from '../types/employee';

const employeePath = '/employees';

export const employeeApi = {
  async getAll() {
    const response = await httpClient.get<Employee[]>(employeePath);
    return response.data;
  },

  async getById(id: number) {
    const response = await httpClient.get<Employee>(`${employeePath}/${id}`);
    return response.data;
  },

  async create(payload: EmployeePayload) {
    const response = await httpClient.post<Employee>(employeePath, payload);
    return response.data;
  },

  async update(id: number, payload: EmployeePayload) {
    const response = await httpClient.put<Employee>(`${employeePath}/${id}`, payload);
    return response.data;
  },

  async remove(id: number) {
    await httpClient.delete(`${employeePath}/${id}`);
  },
};
