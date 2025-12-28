import { http } from "./http";
import { Shift } from "../types/shift";

type ShiftResponse = { shift?: Shift } | Shift;
type ShiftListResponse = { items?: Shift[] } | Shift[];

const normalizeShift = (res: ShiftResponse): Shift => {
  if (!res) throw new Error("Empty response");
  if (!Array.isArray(res) && (res as { shift?: Shift }).shift) {
    return (res as { shift: Shift }).shift;
  }
  return res as Shift;
};

export const startShift = async (vehicleId?: string | number): Promise<Shift> => {
  const body: Record<string, unknown> = {};
  if (vehicleId !== undefined) {
    body.vehicleId = Number(vehicleId);
  }
  const res = await http<ShiftResponse>("/api/v1/shifts/start", {
    method: "POST",
    body,
  });
  return normalizeShift(res);
};

export const endShift = async (shiftId: string | number): Promise<Shift> => {
  const res = await http<ShiftResponse>(`/api/v1/shifts/${shiftId}/end`, {
    method: "POST",
    body: {},
  });
  return normalizeShift(res);
};

export const getMyActiveShift = async (): Promise<Shift | null> => {
  // No dedicated endpoint; list shifts for current user (implicit via auth) and pick one without endAt.
  const res = await http<ShiftListResponse>("/api/v1/shifts");
  const items = Array.isArray(res)
    ? res
    : Array.isArray((res as { items?: Shift[] }).items)
      ? (res as { items: Shift[] }).items
      : [];
  const active = items.find((s) => !s.endAt);
  return active || null;
};
