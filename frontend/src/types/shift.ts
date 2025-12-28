export type Shift = {
  id: number | string;
  userId?: number | string;
  vehicleId?: number | string | null;
  startAt: string;
  endAt?: string | null;
  status?: "ACTIVE" | "ENDED";
};
