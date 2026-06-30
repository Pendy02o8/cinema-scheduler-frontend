import type { Position } from './position';

export type PositionRequirement = {
  id: number;
  startTime: string;
  endTime: string;
  requiredCount: number;
  position: Position;
};

export type PositionRequirementPayload = {
  position: {
    id: number;
  };
  requiredCount: number;
  startTime: string;
  endTime: string;
};
