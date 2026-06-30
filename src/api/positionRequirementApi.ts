import httpClient from './httpClient';
import type {
  PositionRequirement,
  PositionRequirementPayload,
} from '../types/positionRequirement';

const positionRequirementPath = '/position-requirements';

export const positionRequirementApi = {
  async getAll() {
    const response = await httpClient.get<PositionRequirement[]>(positionRequirementPath);
    return response.data;
  },

  async create(payload: PositionRequirementPayload) {
    const response = await httpClient.post<PositionRequirement>(positionRequirementPath, payload);
    return response.data;
  },

  async update(id: number, payload: PositionRequirementPayload) {
    const response = await httpClient.put<PositionRequirement>(
      `${positionRequirementPath}/${id}`,
      payload,
    );
    return response.data;
  },

  async remove(id: number) {
    await httpClient.delete(`${positionRequirementPath}/${id}`);
  },
};
