import { http } from "./http";
import { osloToday } from "../utils/oslo";

type TimesheetResponse = {
  from: string;
  to: string;
  totals: { minutes: number; hours: number };
  items: Array<{ date: string; minutes: number; hours?: number; userId?: number | string }>;
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
