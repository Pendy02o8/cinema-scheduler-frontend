import { availabilityApi } from '../api/availabilityApi';
import type { AvailabilityPayload } from '../types/availability';

export const availabilityService = {
  getAvailability() {
    return availabilityApi.getAll();
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
};
