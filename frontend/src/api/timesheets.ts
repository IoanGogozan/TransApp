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
export type WorkEntry = {
  id: string;
  date: string;
  activityType: "DRIVING" | "OTHER_WORK" | "BREAK" | "AVAILABILITY";
  durationMin: number;
  note?: string | null;
  customerOption?: { id: string; name: string } | null;
  routeOption?: { id: string; name: string } | null;
  vehicle?: { id: number; regNumber: string; name: string | null } | null;
};

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
  totalsMinutes: {
    DRIVING: number;
    OTHER_WORK: number;
    BREAK: number;
    AVAILABILITY: number;
  };
  routes: RouteOption[];
  vehicles: VehicleOption[];
  customers: CustomerOption[];
  entriesCount: number;
  checkIns: Array<{
    vehicleId: number;
    regNumber: string;
    checkedAt: string;
    allOk: boolean;
  }>;
  customerBreakdown: Array<{
    customerId: string | null;
    customerName: string;
    routes: string[];
    vehicles: Array<{ vehicleId: number; regNumber: string }>;
    minutes: {
      DRIVING: number;
      OTHER_WORK: number;
      BREAK: number;
      AVAILABILITY: number;
    };
    totalMin: number;
    entryCount: number;
  }>;
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

export type WorkEntryDetail = {
  id: string;
  activityType: "DRIVING" | "OTHER_WORK" | "BREAK" | "AVAILABILITY";
  durationMin: number;
  vehicleId?: number | null;
  customer: { name: string } | null;
  route: { name: string } | null;
  vehicle: { regNumber: string; name: string | null } | null;
  note: string | null;
};

export type AdminWorkRunDetailsResponse = {
  date: string;
  driverId: number;
  entries: WorkEntryDetail[];
  checkIns: Array<{
    vehicleId: number;
    vehicle: { regNumber: string; name: string | null } | null;
    checkedAt: string;
    allOk: boolean;
    note: string | null;
  }>;
};

export type RecentVehicleCheckIn = {
  userId?: number;
  vehicleId: number;
  checkedInAt?: string;
  createdAt?: string;
};

export type VehicleCheckInStatus = {
  vehicleId: number;
  required: boolean;
  isValid: boolean;
  hoursValid: number;
  checkedInAt: string | null;
  validUntil: string | null;
};

export const getMyRuns = (date?: string) => {
  const qs = date ? `?date=${encodeURIComponent(date)}` : "";
  return http<WorkRunsResponse>(`/api/v1/me/runs${qs}`);
};

export const getMyEntries = (date: string) =>
  http<{ items: WorkEntry[] }>(`/api/v1/me/entries?date=${encodeURIComponent(date)}`);

export const createMyEntry = (payload: {
  date: string;
  activityType: WorkEntry["activityType"];
  durationMin: number;
  customerOptionId?: string | null;
  routeOptionId?: string | null;
  vehicleId?: number | null;
  note?: string | null;
}) =>
  http<WorkEntry>("/api/v1/me/entries", {
    method: "POST",
    body: payload,
  });

export const updateMyEntry = (
  id: string,
  payload: {
    date?: string;
    activityType?: WorkEntry["activityType"];
    durationMin?: number;
    customerOptionId?: string | null;
    routeOptionId?: string | null;
    vehicleId?: number | null;
    note?: string | null;
  },
) =>
  http<WorkEntry>(`/api/v1/me/entries/${id}`, {
    method: "PATCH",
    body: payload,
  });

export const deleteMyEntry = (id: string) =>
  http<void>(`/api/v1/me/entries/${id}`, {
    method: "DELETE",
  });

export const getAdminWorkRunDetails = (params: { date: string; driverId: number }) => {
  const qs = new URLSearchParams();
  qs.set("date", params.date);
  qs.set("driverId", String(params.driverId));
  return http<AdminWorkRunDetailsResponse>(`/api/v1/timesheets/work-runs/details?${qs.toString()}`);
};

export const updateAdminWorkEntry = (
  id: string,
  payload: { activityType?: WorkEntry["activityType"]; durationMin?: number; note?: string | null },
) =>
  http<{ entry: { id: string; activityType: string; durationMin: number; note: string | null } }>(
    `/api/v1/timesheets/work-entries/${id}`,
    { method: "PATCH", body: payload },
  );

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

export const getMyVehicleCheckInStatus = (params: { vehicleId: number; date: string }) =>
  http<VehicleCheckInStatus>(
    `/api/v1/me/vehicle-checkins/status?vehicleId=${params.vehicleId}&date=${encodeURIComponent(params.date)}`,
  );
