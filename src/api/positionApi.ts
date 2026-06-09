import httpClient from './httpClient';
import type { Position, PositionPayload } from '../types/position';

const positionPath = '/positions';

export const positionApi = {
  async getAll() {
    const response = await httpClient.get<Position[]>(positionPath);
    return response.data;
  },

  async create(payload: PositionPayload) {
    const response = await httpClient.post<Position>(positionPath, payload);
    return response.data;
  },

  async update(id: number, payload: PositionPayload) {
    const response = await httpClient.put<Position>(`${positionPath}/${id}`, payload);
    return response.data;
  },

  async remove(id: number) {
    await httpClient.delete(`${positionPath}/${id}`);
  },
};
