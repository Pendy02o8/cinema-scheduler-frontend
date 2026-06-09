import { positionApi } from '../api/positionApi';
import type { PositionPayload } from '../types/position';

export const positionService = {
  getPositions() {
    return positionApi.getAll();
  },

  createPosition(payload: PositionPayload) {
    return positionApi.create(payload);
  },

  updatePosition(id: number, payload: PositionPayload) {
    return positionApi.update(id, payload);
  },

  deletePosition(id: number) {
    return positionApi.remove(id);
  },
};
