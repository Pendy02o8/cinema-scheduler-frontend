import { availabilityApi } from '../api/availabilityApi';
import type { AvailabilityPayload } from '../types/availability';

export const availabilityService = {
  getAvailability() {
    return availabilityApi.getAll();
  },

  getAvailabilityById(id: number) {
    return availabilityApi.getById(id);
  },

  getAvailabilityByEmployee(employeeId: number) {
    return availabilityApi.getByEmployee(employeeId);
  },

  createAvailability(payload: AvailabilityPayload) {
    return availabilityApi.create(payload);
  },

  updateAvailability(id: number, payload: AvailabilityPayload) {
    return availabilityApi.update(id, payload);
  },

  deleteAvailability(id: number) {
    return availabilityApi.remove(id);
  },

  importAvailabilityExcel(file: File, weeklyScheduleId: number) {
    return availabilityApi.importExcel(file, weeklyScheduleId);
  },
};
