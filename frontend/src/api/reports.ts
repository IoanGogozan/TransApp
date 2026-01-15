import { http } from "./http";
import { osloToday } from "../utils/oslo";
import { getToken } from "../auth/token";

type TimesheetResponse = {
  from: string;
  to: string;
  totals: { minutes: number; hours: number };
  items: Array<{ date: string; minutes: number; hours?: number; userId?: number | string }>;
};

type WorkEntriesGroupBy =
  | "day"
  | "day_driver"
  | "day_driver_activity"
  | "day_customer_route"
  | "entry";

export type WorkEntriesTotals = {
  minutesTotal: number;
  minutesByActivity: {
    DRIVING: number;
    OTHER_WORK: number;
    BREAK: number;
    AVAILABILITY: number;
  };
};

export type WorkEntriesItem = {
  date: string;
  driverId?: number;
  activityType?: "DRIVING" | "OTHER_WORK" | "BREAK" | "AVAILABILITY";
  minutesTotal: number;
  minutesByActivity?: WorkEntriesTotals["minutesByActivity"];
  customer?: string;
  route?: string;
  entriesCount?: number;
  driver?: string;
  vehicleReg?: string;
  vehicleName?: string;
  minutes?: number;
  note?: string;
  source?: string;
};

export type WorkEntriesResponse = {
  from: string;
  to: string;
  groupBy: WorkEntriesGroupBy;
  totals: WorkEntriesTotals;
  items: WorkEntriesItem[];
};

const buildWorkEntriesQuery = (params: {
  from: string;
  to: string;
  groupBy?: WorkEntriesGroupBy;
  driverId?: string;
}) => {
  const qs = new URLSearchParams();
  qs.set("from", params.from);
  qs.set("to", params.to);
  if (params.groupBy) qs.set("groupBy", params.groupBy);
  if (params.driverId) qs.set("driverId", params.driverId);
  return qs.toString();
};

export const getMyTimesheetToday = async (): Promise<{
  items: Array<{ date: string; minutes: number; hours?: number }>;
  totalMinutes: number;
  osloDate?: string;
}> => {
  const { today } = osloToday();
  const qs = `/api/v1/reports/timesheet?from=${today}&to=${today}`;
  const res = await http<TimesheetResponse>(qs);
  const items =
    (res.items || []).map((item) => ({
      date: item.date,
      minutes: item.minutes,
      hours: item.hours,
    })) || [];
  const totalMinutes = res.totals?.minutes ?? items.reduce((sum, r) => sum + (r.minutes || 0), 0);
  return { items, totalMinutes, osloDate: today };
};

export const getWorkEntriesReport = async (params: {
  from: string;
  to: string;
  groupBy?: WorkEntriesGroupBy;
  driverId?: string;
}): Promise<WorkEntriesResponse> => {
  const qs = buildWorkEntriesQuery(params);
  return http<WorkEntriesResponse>(`/api/v1/reports/work-entries?${qs}`);
};

export const downloadWorkEntriesCsv = async (params: {
  from: string;
  to: string;
  groupBy?: WorkEntriesGroupBy;
  driverId?: string;
}): Promise<Blob> => {
  const qs = buildWorkEntriesQuery(params);
  const res = await fetch(`/api/v1/reports/work-entries.csv?${qs}`, {
    method: "GET",
    headers: {
      Accept: "text/csv",
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to download CSV");
  }
  return res.blob();
};
