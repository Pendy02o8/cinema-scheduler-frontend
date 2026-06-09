export type Position = {
  id: number;
  name: string;
  isRequired: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type PositionPayload = {
  name: string;
  isRequired: boolean;
};
