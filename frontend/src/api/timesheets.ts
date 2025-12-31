import { http } from "./http";

export type TimesheetEntryInput = {
  activityType: "DRIVING" | "OTHER_WORK" | "BREAK" | "AVAILABILITY";
  start: string;
  end: string;
};

export type TimesheetDayResponse = {
  date: string;
  routeOptionId: string | null;
  vehicleId: number | null;
  note: string | null;
  overtimeType: "OT_50" | "OT_100" | null;
  overtimeReason: string | null;
  entries: TimesheetEntryInput[];
};

export type RouteOption = { id: string; name: string };
export type VehicleOption = { id: number; regNumber: string; name: string | null };
export type CustomerOption = { id: string; name: string };

export const getMyTimesheet = (date: string) => http<TimesheetDayResponse>(`/api/v1/me/timesheet/${date}`);

export const saveMyTimesheet = (date: string, payload: Omit<TimesheetDayResponse, "date">) =>
  http<TimesheetDayResponse>(`/api/v1/me/timesheet/${date}`, {
    method: "PUT",
    body: payload,
  });

export const getMyRoutes = () => http<{ routes: RouteOption[] }>("/api/v1/me/routes");
export const getMyVehicles = () => http<{ vehicles: VehicleOption[] }>("/api/v1/me/vehicles");
export const getMyCustomers = () => http<{ customers: CustomerOption[] }>("/api/v1/me/customers");

export type AdminTimesheetRow = {
  date: string;
  driver: { id: number; email: string | null; phone: string | null; username: string | null };
  route: { id: string; name: string } | null;
  totalsMinutes: {
    DRIVING: number;
    OTHER_WORK: number;
    BREAK: number;
    AVAILABILITY: number;
  };
  overtimeType: "OT_50" | "OT_100" | null;
  overtimeReason: string | null;
};

export const getAdminTimesheets = (params: { from: string; to: string; driverId?: number; routeId?: string }) => {
  const qs = new URLSearchParams();
  qs.set("from", params.from);
  qs.set("to", params.to);
  if (params.driverId !== undefined) qs.set("driverId", String(params.driverId));
  if (params.routeId) qs.set("routeId", params.routeId);
  return http<{ timesheets: AdminTimesheetRow[] }>(`/api/v1/timesheets/work-runs?${qs.toString()}`);
};

export type WorkRun = {
  id: string;
  activityType: "DRIVING" | "OTHER_WORK" | "BREAK" | "AVAILABILITY";
  customerOptionId?: string;
  routeOptionId: string;
  vehicleId: number | null;
  startedAt: string;
  endedAt: string | null;
  customerOption?: { id: string; name: string };
  routeOption?: { id: string; name: string };
  vehicle?: { id: number; regNumber: string; name: string | null } | null;
};

export type WorkRunsResponse = {
  date: string;
  activeRun: WorkRun | null;
  runs: WorkRun[];
};

export type RecentVehicleCheckIn = {
  vehicleId: number;
  checkedInAt: string;
};

export const getMyRuns = (date?: string) => {
  const qs = date ? `?date=${encodeURIComponent(date)}` : "";
  return http<WorkRunsResponse>(`/api/v1/me/runs${qs}`);
};

export const startMyRun = (payload: {
  activityType: WorkRun["activityType"];
  customerOptionId: string;
  routeOptionId: string;
  vehicleId?: number;
}) =>
  http<WorkRun>("/api/v1/me/runs/start", {
    method: "POST",
    body: payload,
  });

export const stopMyRun = () =>
  http<WorkRun>("/api/v1/me/runs/stop", {
    method: "POST",
  });

export const createVehicleCheckIn = (payload: { vehicleId: number; allOk: boolean; note?: string }) =>
  http<{
    id: string;
    vehicleId: number;
    allOk: boolean;
    note: string | null;
    checkedAt: string;
  }>("/api/v1/me/vehicle-checkins", {
    method: "POST",
    body: payload,
  });

export const getMyRecentVehicleCheckIns = (hours = 24): Promise<RecentVehicleCheckIn[]> => {
  const safeHours = Number.isFinite(hours) && hours > 0 ? hours : 24;
  const qs = new URLSearchParams();
  qs.set("hours", String(safeHours));
  return http<{ checkIns: RecentVehicleCheckIn[] }>(`/api/v1/me/vehicle-checkins/recent?${qs.toString()}`)
    .then((res) => res.checkIns);
};
