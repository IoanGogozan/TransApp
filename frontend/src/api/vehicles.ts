import { http } from "./http";
import { Vehicle } from "../types/vehicle";

type VehicleListResponse = { items?: Vehicle[]; vehicles?: Vehicle[]; meta?: unknown } | Vehicle[];
type VehicleCreateResponse = { vehicle?: Vehicle } | Vehicle;
type VehicleSingleResponse = { vehicle?: Vehicle } | Vehicle;

export const listVehicles = async (): Promise<Vehicle[]> => {
  const res = await http<VehicleListResponse>("/api/v1/vehicles");
  if (Array.isArray(res)) return res;
  if (res?.items && Array.isArray(res.items)) return res.items;
  if (res?.vehicles && Array.isArray(res.vehicles)) return res.vehicles;
  return [];
};

export const createVehicle = async (input: {
  regNumber: string;
  name?: string;
  type?: string;
  active?: boolean;
}): Promise<Vehicle> => {
  const body = {
    regNumber: input.regNumber,
    name: input.name,
    type: input.type,
    active: input.active,
  };
  const res = await http<VehicleCreateResponse>("/api/v1/vehicles", {
    method: "POST",
    body,
  });
  if (!res) {
    throw new Error("Empty response");
  }
  if (!Array.isArray(res) && (res as { vehicle?: Vehicle }).vehicle) {
    return (res as { vehicle: Vehicle }).vehicle;
  }
  return res as Vehicle;
};

export const getVehicleById = async (id: string | number): Promise<Vehicle> => {
  try {
    const res = await http<VehicleSingleResponse>(`/api/v1/vehicles/${id}`);
    if (!res) throw new Error("Vehicle not found");
    if (!Array.isArray(res) && (res as { vehicle?: Vehicle }).vehicle) {
      return (res as { vehicle: Vehicle }).vehicle;
    }
    return res as Vehicle;
  } catch (err: any) {
    if (err?.status !== 404 && err?.status !== 405) {
      throw err;
    }
    // Fallback: list and find if endpoint missing/404
    const list = await listVehicles();
    const found = list.find((v) => String(v.id) === String(id));
    if (!found) throw new Error("Vehicle not found");
    return found;
  }
};
