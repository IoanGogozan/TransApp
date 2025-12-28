const KEY = "transapp_active_vehicle_id";

export const getActiveVehicleId = (): string | null => {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(KEY);
};

export const setActiveVehicleId = (id: string | number): void => {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(KEY, String(id));
};

export const clearActiveVehicleId = (): void => {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(KEY);
};
