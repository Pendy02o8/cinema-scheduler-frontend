import { positionRequirementApi } from '../api/positionRequirementApi';
import type { PositionRequirementPayload } from '../types/positionRequirement';

export const positionRequirementService = {
  getPositionRequirements() {
    return positionRequirementApi.getAll();
  },

  createPositionRequirement(payload: PositionRequirementPayload) {
    return positionRequirementApi.create(payload);
  },

  updatePositionRequirement(id: number, payload: PositionRequirementPayload) {
    return positionRequirementApi.update(id, payload);
  },

  deletePositionRequirement(id: number) {
    return positionRequirementApi.remove(id);
  },
};
