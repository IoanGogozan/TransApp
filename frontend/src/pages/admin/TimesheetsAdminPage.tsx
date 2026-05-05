import { useEffect, useMemo, useState } from "react";
import { ApiError } from "../../api/http";
import { listCompanyUsers } from "../../api/users";
import {
  AdminTimesheetRow,
  AdminWorkRunDetailsResponse,
  WorkEntryDetail,
  getAdminTimesheets,
  getAdminWorkRunDetails,
  updateAdminWorkEntry,
} from "../../api/timesheets";
import TableWrap from "../../components/TableWrap";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import FormField from "../../components/ui/FormField";
import Input from "../../components/ui/Input";
import ListState from "../../components/ui/ListState";
import SectionHeader from "../../components/ui/SectionHeader";

const toDateInput = (d: Date) => d.toISOString().slice(0, 10);

const osloToday = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Oslo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return `${year}-${month}-${day}`;
};

const osloWeekStart = (todayYYYYMMDD: string) => {
  const [yearStr, monthStr, dayStr] = todayYYYYMMDD.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  const utcNoon = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const isoDay = ((utcNoon.getUTCDay() + 6) % 7) + 1;
  const diffDays = isoDay - 1;
  const weekStart = new Date(utcNoon);
  weekStart.setUTCDate(weekStart.getUTCDate() - diffDays);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Oslo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(weekStart);
  const yearOut = parts.find((part) => part.type === "year")?.value;
  const monthOut = parts.find((part) => part.type === "month")?.value;
  const dayOut = parts.find((part) => part.type === "day")?.value;
  return `${yearOut}-${monthOut}-${dayOut}`;
};

const osloMonthStart = (todayYYYYMMDD: string) => {
  const [yearStr, monthStr] = todayYYYYMMDD.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const utcNoon = new Date(Date.UTC(year, month - 1, 1, 12, 0, 0));
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Oslo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(utcNoon);
  const yearOut = parts.find((part) => part.type === "year")?.value;
  const monthOut = parts.find((part) => part.type === "month")?.value;
  const dayOut = parts.find((part) => part.type === "day")?.value;
  return `${yearOut}-${monthOut}-${dayOut}`;
};

const defaultRange = () => {
  const today = osloToday();
  return { from: today, to: today };
};

const bestIdentifier = (driver: AdminTimesheetRow["driver"]) =>
  driver.username || driver.phone || driver.email || "Unknown driver";

const driverLabel = (driver: AdminTimesheetRow["driver"]) => `${bestIdentifier(driver)} (id:${driver.id})`;

const formatTotal = (minutes: number) => {
  const safeMinutes = Number.isFinite(minutes) && minutes > 0 ? minutes : 0;
  const hours = Math.floor(safeMinutes / 60);
  const mins = safeMinutes % 60;
  return `${hours}h ${mins}m`;
};

const formatDurationHours = (minutes: number) => {
  const safeMinutes = Number.isFinite(minutes) && minutes > 0 ? minutes : 0;
  const hours = Math.floor(safeMinutes / 60);
  const mins = safeMinutes % 60;
  return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
};

const formatList = (items: string[]) => {
  if (items.length === 0) return "";
  if (items.length <= 2) return items.join(", ");
  return `${items[0]}, ${items[1]} +${items.length - 2}`;
};

const formatDurationMinutes = (minutes?: number | null) => {
  const safeMinutes = Number.isFinite(minutes) && (minutes ?? 0) > 0 ? (minutes ?? 0) : 0;
  const hours = Math.floor(safeMinutes / 60);
  const mins = safeMinutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
};

const formatMinutesAsHM = (minutes: number) => {
  const safeMinutes = Number.isFinite(minutes) && minutes > 0 ? minutes : 0;
  const hours = Math.floor(safeMinutes / 60);
  const mins = safeMinutes % 60;
  return `${hours}h ${mins}m`;
};

const minutesToHHMM = (minutes: number) => {
  const safeMinutes = Number.isFinite(minutes) && minutes > 0 ? minutes : 0;
  const hours = Math.floor(safeMinutes / 60);
  const mins = safeMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
};

const parseDurationToMinutes = (value: string) => {
  const trimmed = value.trim();
  const match = /^(\d+):([0-5]\d)$/.exec(trimmed);
  if (!match) return null;
  const hours = Number(match[1]);
  const mins = Number(match[2]);
  const total = hours * 60 + mins;
  if (total <= 0) return null;
  return total;
};

const fmtCheckIn = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Oslo",
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const TimesheetsAdminPage = () => {
  const initialRange = useMemo(() => defaultRange(), []);
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [rows, setRows] = useState<AdminTimesheetRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drivers, setDrivers] = useState<Array<{ id: number; label: string }>>([]);
  const [selectedDriverId, setSelectedDriverId] = useState<string>("ALL");
  const [activeQuickRange, setActiveQuickRange] = useState<"WEEK" | "MONTH" | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [detailsRuns, setDetailsRuns] = useState<WorkEntryDetail[]>([]);
  const [detailsCheckIns, setDetailsCheckIns] = useState<AdminWorkRunDetailsResponse["checkIns"]>([]);
  const [detailsDriver, setDetailsDriver] = useState<AdminTimesheetRow["driver"] | null>(null);
  const [detailsDate, setDetailsDate] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<WorkEntryDetail | null>(null);
  const [editActivityType, setEditActivityType] = useState("DRIVING");
  const [editDuration, setEditDuration] = useState("00:00");
  const [editNote, setEditNote] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const loadWithRange = async (fromStr: string, toStr: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAdminTimesheets({ from: fromStr, to: toStr });
      setRows(res.timesheets || []);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to load timesheets";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const load = async () => loadWithRange(from, to);

  const applyDefaultRangeAndLoad = () => {
    const today = osloToday();
    setFrom(today);
    setTo(today);
    loadWithRange(today, today);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const loadDrivers = async () => {
      try {
        const users = await listCompanyUsers();
        const nextDrivers = users
          .filter((user) => user.role === "DRIVER" && user.active === true)
          .map((user) => ({
            id: Number(user.id),
            label: user.username || user.phone || user.email || "Unknown driver",
          }))
          .sort((a, b) => a.label.localeCompare(b.label));
        setDrivers(nextDrivers);
      } catch (err) {
        setDrivers([]);
      }
    };
    loadDrivers();
  }, []);

  const openDetails = async (row: AdminTimesheetRow) => {
    setDetailsOpen(true);
    setDetailsLoading(true);
    setDetailsError(null);
    setDetailsRuns([]);
    setDetailsCheckIns([]);
    setDetailsDriver(row.driver);
    setDetailsDate(row.date);
    try {
      const res = await getAdminWorkRunDetails({ date: row.date, driverId: row.driver.id });
      setDetailsRuns(res.entries || []);
      setDetailsCheckIns(res.checkIns || []);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to load work runs";
      setDetailsError(msg);
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeDetails = () => {
    setDetailsOpen(false);
    setDetailsRuns([]);
    setDetailsCheckIns([]);
    setDetailsDriver(null);
    setDetailsDate(null);
    setDetailsError(null);
    setEditOpen(false);
    setEditEntry(null);
    setEditError(null);
    setEditSaving(false);
  };

  const openEditModal = (entry: WorkEntryDetail) => {
    setEditEntry(entry);
    setEditActivityType(entry.activityType);
    setEditDuration(minutesToHHMM(entry.durationMin));
    setEditNote(entry.note ?? "");
    setEditError(null);
    setEditOpen(true);
  };

  const closeEditModal = () => {
    setEditOpen(false);
    setEditEntry(null);
    setEditError(null);
  };

  const saveEdit = async () => {
    if (!editEntry) return;
    const nextDurationMin = parseDurationToMinutes(editDuration);
    if (!nextDurationMin) {
      setEditError("Duration must be in HH:MM format and greater than 00:00.");
      return;
    }
    setEditSaving(true);
    setEditError(null);
    try {
      await updateAdminWorkEntry(editEntry.id, {
        activityType: editActivityType as WorkEntryDetail["activityType"],
        durationMin: nextDurationMin,
        note: editNote.trim() ? editNote.trim() : null,
      });
      if (detailsDate && detailsDriver) {
        const res = await getAdminWorkRunDetails({ date: detailsDate, driverId: detailsDriver.id });
        setDetailsRuns(res.entries || []);
        setDetailsCheckIns(res.checkIns || []);
      }
      await loadWithRange(from, to);
      closeEditModal();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to update entry";
      setEditError(msg);
    } finally {
      setEditSaving(false);
    }
  };

  const filteredRows = selectedDriverId === "ALL"
    ? rows
    : rows.filter((row) => String(row.driver.id) === selectedDriverId);
  const showRuns = rows.some((row) => typeof row.entriesCount === "number");
  const latestCheckInByVehicleId = useMemo(() => {
    const map = new Map<number, AdminWorkRunDetailsResponse["checkIns"][number]>();
    detailsCheckIns.forEach((checkIn) => {
      const key = checkIn.vehicleId;
      const existing = map.get(key);
      if (!existing || new Date(checkIn.checkedAt).getTime() > new Date(existing.checkedAt).getTime()) {
        map.set(key, checkIn);
      }
    });
    return map;
  }, [detailsCheckIns]);

  const exportCsv = () => {
    const header = [
      "Date",
      "Driver",
      "Customer",
      "Routes",
      "Vehicles",
      "Check-ins",
      "Driving",
      "Other Work",
      "Break",
      "Availability",
      "Total",
      "Entries",
    ];
    const timeFmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Oslo",
      hour: "2-digit",
      minute: "2-digit",
    });
    const lines = filteredRows.flatMap((row) => {
      const breakdown = row.customerBreakdown ?? [];
      const checkIns = row.checkIns ?? [];
      return breakdown.map((item) => {
        const vehicleIds = new Set(item.vehicles.map((vehicle) => vehicle.vehicleId));
        const checkInCell = checkIns.length
          ? checkIns
            .filter((ci) => vehicleIds.has(ci.vehicleId))
            .map((ci) => `${ci.regNumber || `Vehicle#${ci.vehicleId}`} ${timeFmt.format(new Date(ci.checkedAt))} - ${ci.allOk ? "OK" : "Issues"}`)
            .join("; ") || "N/A"
          : "N/A";
        return [
          row.date,
          bestIdentifier(row.driver),
          item.customerName,
          item.routes.join("; "),
          item.vehicles.map((vehicle) => vehicle.regNumber).join("; "),
          checkInCell,
          formatMinutesAsHM(item.minutes.DRIVING),
          formatMinutesAsHM(item.minutes.OTHER_WORK),
          formatMinutesAsHM(item.minutes.BREAK),
          formatMinutesAsHM(item.minutes.AVAILABILITY),
          formatMinutesAsHM(item.totalMin),
          item.entryCount,
        ];
      });
    });
    const csv = [header, ...lines]
      .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `timesheets_${from}_to_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen w-full px-3 py-3 sm:px-5 sm:py-5">
      <div className="mx-auto w-full max-w-7xl px-0 sm:px-4 sm:py-6">
        <Card className="mb-5 w-full max-w-none rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <SectionHeader
                title="Timesheets"
                subtitle={`${from} to ${to}`}
              />
              <div className="flex flex-wrap gap-2 md:hidden">
                <Button variant="primary" size="sm" onClick={load} disabled={loading}>
                  {loading ? "Loading..." : "Load"}
                </Button>
                <Button variant="secondary" size="sm" onClick={exportCsv} disabled={rows.length === 0}>
                  Export CSV
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <FormField label="From">
                <Input
                  type="date"
                  value={from}
                  onChange={(e) => {
                    setActiveQuickRange(null);
                    setFrom(e.target.value);
                  }}
                />
              </FormField>
              <FormField label="To">
                <Input
                  type="date"
                  value={to}
                  onChange={(e) => {
                    setActiveQuickRange(null);
                    setTo(e.target.value);
                  }}
                />
              </FormField>
              <FormField label="Driver">
                <select
                  value={selectedDriverId}
                  onChange={(e) => {
                    const next = e.target.value;
                    setSelectedDriverId(next);
                    setActiveQuickRange(null);
                    load();
                  }}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:bg-slate-100 disabled:text-slate-500"
                >
                  <option value="ALL">All drivers</option>
                  {drivers.map((driver) => (
                    <option key={driver.id} value={String(driver.id)}>
                      {driver.label}
                    </option>
                  ))}
                </select>
                </FormField>
            </div>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`border ${activeQuickRange === "WEEK" ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-slate-100 text-slate-900 hover:bg-slate-200"}`}
                  onClick={() => {
                    if (activeQuickRange === "WEEK") {
                      setActiveQuickRange(null);
                      applyDefaultRangeAndLoad();
                      return;
                    }
                    const today = osloToday();
                    const start = osloWeekStart(today);
                    setActiveQuickRange("WEEK");
                    setFrom(start);
                    setTo(today);
                    loadWithRange(start, today);
                  }}
                >
                  This week
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`border ${activeQuickRange === "MONTH" ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-slate-100 text-slate-900 hover:bg-slate-200"}`}
                  onClick={() => {
                    if (activeQuickRange === "MONTH") {
                      setActiveQuickRange(null);
                      applyDefaultRangeAndLoad();
                      return;
                    }
                    const today = osloToday();
                    const start = osloMonthStart(today);
                    setActiveQuickRange("MONTH");
                    setFrom(start);
                    setTo(today);
                    loadWithRange(start, today);
                  }}
                >
                  This month
                </Button>
              </div>
              <div className="hidden flex-wrap gap-2 md:flex md:justify-end">
                <Button variant="primary" size="sm" onClick={load} disabled={loading}>
                  {loading ? "Loading..." : "Load"}
                </Button>
                <Button variant="secondary" size="sm" onClick={exportCsv} disabled={rows.length === 0}>
                  Export CSV
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <ListState
          loading={loading}
          hasItems={filteredRows.length > 0}
          emptyTitle="No timesheets"
          emptyMessage="No rows found for the current filters."
          errorMessage={error}
        >
          <div className="hidden md:block">
            <TableWrap className="max-h-[70vh] rounded-xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
              <table className="min-w-[900px] w-full border-separate border-spacing-0 text-sm">
                <thead>
                  <tr>
                    <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                      Date
                    </th>
                    <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                      Driver
                    </th>
                    <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                      Vehicles
                    </th>
                    <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                      Routes
                    </th>
                    {showRuns ? (
                      <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                        Entries
                      </th>
                    ) : null}
                    <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                      Total
                    </th>
                    <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                      Breakdown
                    </th>
                    <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row, idx) => {
                    const totalMinutes =
                      row.totalsMinutes.DRIVING +
                      row.totalsMinutes.OTHER_WORK +
                      row.totalsMinutes.BREAK +
                      row.totalsMinutes.AVAILABILITY;
                    const breakdown = [
                      { label: "Driving", minutes: row.totalsMinutes.DRIVING },
                      { label: "Other", minutes: row.totalsMinutes.OTHER_WORK },
                      { label: "Break", minutes: row.totalsMinutes.BREAK },
                      { label: "Avail", minutes: row.totalsMinutes.AVAILABILITY },
                    ];
                    const vehiclesLabel = formatList(row.vehicles.map((vehicle) => vehicle.regNumber));
                    const routesLabel = formatList(row.routes.map((route) => route.name));

                    return (
                      <tr key={`${row.date}-${row.driver.id}-${idx}`} className="odd:bg-white even:bg-slate-50/50">
                        <td className="border-b border-slate-100 px-3 py-2 align-middle text-slate-800">
                          {row.date}
                        </td>
                        <td className="border-b border-slate-100 px-3 py-2 align-middle text-slate-800">
                          <div className="flex min-w-[200px] flex-col gap-0.5 break-words">
                            {bestIdentifier(row.driver)}
                          </div>
                        </td>
                        <td className="border-b border-slate-100 px-3 py-2 align-middle text-slate-800">
                          {vehiclesLabel ? (
                            <span
                              className="block max-w-[240px] truncate"
                              title={row.vehicles.map((vehicle) => vehicle.regNumber).join(", ")}
                            >
                              {vehiclesLabel}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="border-b border-slate-100 px-3 py-2 align-middle text-slate-800">
                          {routesLabel ? (
                            <span
                              className="block max-w-[240px] truncate"
                              title={row.routes.map((route) => route.name).join(", ")}
                            >
                              {routesLabel}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        {showRuns ? (
                          <td className="border-b border-slate-100 px-3 py-2 align-middle text-slate-800">
                            {row.entriesCount}
                          </td>
                        ) : null}
                        <td className="border-b border-slate-100 px-3 py-2 align-middle font-semibold text-slate-900">
                          {formatTotal(totalMinutes)}
                        </td>
                        <td className="border-b border-slate-100 px-3 py-2 align-middle">
                          <div className="flex flex-wrap gap-2 text-xs text-slate-700">
                            {breakdown.map((item) => (
                              <span
                                key={item.label}
                                className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-1"
                              >
                                {item.label}: {formatDurationHours(item.minutes)}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="border-b border-slate-100 px-3 py-2 align-middle text-center">
                          <Button variant="secondary" size="sm" type="button" onClick={() => openDetails(row)}>
                            Details
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableWrap>
          </div>

          <div className="block md:hidden">
            <div className="flex flex-col gap-3">
              {filteredRows.map((row, idx) => {
                const totalMinutes =
                  row.totalsMinutes.DRIVING +
                  row.totalsMinutes.OTHER_WORK +
                  row.totalsMinutes.BREAK +
                  row.totalsMinutes.AVAILABILITY;
                const breakdown = [
                  { label: "Driving", minutes: row.totalsMinutes.DRIVING },
                  { label: "Other", minutes: row.totalsMinutes.OTHER_WORK },
                  { label: "Break", minutes: row.totalsMinutes.BREAK },
                  { label: "Avail", minutes: row.totalsMinutes.AVAILABILITY },
                ].filter((item) => item.minutes > 0);

                return (
                  <Card
                    key={`${row.date}-${row.driver.id}-${idx}`}
                    className="w-full max-w-none rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex flex-wrap justify-between gap-2">
                      <div>
                        <strong>{row.date}</strong>
                        <div className="text-sm text-slate-600">{bestIdentifier(row.driver)}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{formatTotal(totalMinutes)}</div>
                        {showRuns ? <div className="text-sm text-slate-600">{row.entriesCount} entries</div> : null}
                      </div>
                    </div>
                    <div className="mt-2.5">
                      <div className="mb-1 text-sm text-slate-600">Vehicles</div>
                      {row.vehicles.length === 0 ? (
                        <div>-</div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {row.vehicles.map((vehicle) => (
                            <span
                              key={vehicle.id}
                              className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700"
                            >
                              {vehicle.regNumber}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="mt-2.5">
                      <div className="mb-1 text-sm text-slate-600">Routes</div>
                      {row.routes.length === 0 ? (
                        <div>-</div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {row.routes.map((route) => (
                            <span
                              key={route.id}
                              className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700"
                            >
                              {route.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="mt-2.5">
                      <div className="mb-1 text-sm text-slate-600">Breakdown</div>
                      {breakdown.length === 0 ? (
                        <div>-</div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {breakdown.map((item) => (
                            <span
                              key={item.label}
                              className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700"
                            >
                              {item.label} {formatDurationHours(item.minutes)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="mt-3">
                      <Button variant="secondary" size="sm" type="button" onClick={() => openDetails(row)}>
                        Details
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </ListState>
      </div>
      {detailsOpen ? (
        <div
          role="presentation"
          onClick={closeDetails}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(17, 24, 39, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
            zIndex: 50,
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
            className="w-[calc(100vw-96px)] max-w-[1100px] max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.18)] max-sm:w-[calc(100vw-24px)] max-sm:p-4"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-extrabold leading-tight text-slate-900 sm:text-3xl">Work run details</h2>
                {detailsDriver && detailsDate ? (
                  <p className="mt-1 text-sm text-slate-500">
                    {detailsDate} | {driverLabel(detailsDriver)}
                  </p>
                ) : null}
              </div>
              <Button
                variant="ghost"
                size="sm"
                type="button"
                className="w-auto rounded-xl px-3 py-2 text-sm"
                onClick={closeDetails}
              >
                Close
              </Button>
            </div>

            {detailsError ? (<div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{detailsError}</div>) : null}

            <div className="mt-3">
              <TableWrap className="rounded-xl border border-slate-200 bg-white">
                <table className="min-w-[900px] w-full table-fixed border-collapse text-sm">
                  <thead>
                    <tr>
                      <th className="w-[120px] border-b border-slate-200 bg-slate-50 px-2.5 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">Activity</th>
                      <th className="w-[180px] border-b border-slate-200 bg-slate-50 px-2.5 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">Customer</th>
                      <th className="w-[160px] border-b border-slate-200 bg-slate-50 px-2.5 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">Route</th>
                      <th className="w-[120px] border-b border-slate-200 bg-slate-50 px-2.5 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">Vehicle</th>
                      <th className="w-[210px] border-b border-slate-200 bg-slate-50 px-2.5 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">Check-in</th>
                      <th className="w-[90px] whitespace-nowrap border-b border-slate-200 bg-slate-50 px-2.5 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">Duration</th>
                      <th className="w-[110px] border-b border-slate-200 bg-slate-50 px-2.5 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailsRuns.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="border-b border-slate-200 px-2.5 py-2 text-center">
                          {detailsLoading ? "Loading..." : "No runs"}
                        </td>
                      </tr>
                    ) : (
                      detailsRuns.map((run, idx) => {
                        const vehicleLabel = run.vehicle?.regNumber || "-";
                        const vehicleId = run.vehicleId ?? null;
                        const checkIn = vehicleId ? latestCheckInByVehicleId.get(vehicleId) : null;
                        const checkInLabel = vehicleId
                          ? checkIn
                            ? `${fmtCheckIn.format(new Date(checkIn.checkedAt))} \u2022 ${checkIn.allOk ? "OK" : "Issues"}`
                            : "No check-in"
                          : "-";
                        return (
                        <tr key={`${run.activityType}-${idx}`}>
                          <td className="border-b border-slate-200 px-2.5 py-2">{run.activityType}</td>
                          <td className="border-b border-slate-200 px-2.5 py-2">{run.customer?.name || "-"}</td>
                          <td className="border-b border-slate-200 px-2.5 py-2">{run.route?.name || "-"}</td>
                          <td className="border-b border-slate-200 px-2.5 py-2">{vehicleLabel}</td>
                          <td className="border-b border-slate-200 px-2.5 py-2">{checkInLabel}</td>
                          <td className="whitespace-nowrap border-b border-slate-200 px-2.5 py-2">{formatDurationMinutes(run.durationMin)}</td>
                          <td className="border-b border-slate-200 px-2.5 py-2">
                            <button
                              type="button"
                              onClick={() => openEditModal(run)}
                              aria-label="Edit entry"
                              title="Edit"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                            >
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                              >
                                <path d="M12 20h9" />
                                <path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </TableWrap>
            </div>
            {editOpen ? (
              <div
                role="dialog"
                aria-modal="true"
                style={{
                  position: "fixed",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 60,
                  pointerEvents: "none",
                }}
              >
                <div
                  onClick={(event) => event.stopPropagation()}
                  style={{
                    pointerEvents: "auto",
                    background: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "12px",
                    padding: "16px",
                    width: "360px",
                    boxShadow: "0 20px 40px rgba(15, 23, 42, 0.2)",
                  }}
                >
                  <div style={{ fontSize: "16px", fontWeight: 700, marginBottom: "12px" }}>Edit entry</div>
                  <div style={{ display: "grid", gap: "10px" }}>
                    <label style={{ display: "grid", gap: "6px" }}>
                      <span style={{ fontSize: "12px", fontWeight: 600, color: "#475569" }}>Activity</span>
                      <select
                        value={editActivityType}
                        onChange={(event) => setEditActivityType(event.target.value)}
                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:bg-slate-100 disabled:text-slate-500"
                      >
                        <option value="DRIVING">DRIVING</option>
                        <option value="OTHER_WORK">OTHER_WORK</option>
                        <option value="BREAK">BREAK</option>
                        <option value="AVAILABILITY">AVAILABILITY</option>
                      </select>
                    </label>
                    <label style={{ display: "grid", gap: "6px" }}>
                      <span style={{ fontSize: "12px", fontWeight: 600, color: "#475569" }}>Duration</span>
                      <input
                        type="text"
                        value={editDuration}
                        onChange={(event) => setEditDuration(event.target.value)}
                        placeholder="HH:MM"
                      />
                    </label>
                    <label style={{ display: "grid", gap: "6px" }}>
                      <span style={{ fontSize: "12px", fontWeight: 600, color: "#475569" }}>Note</span>
                      <input
                        type="text"
                        value={editNote}
                        onChange={(event) => setEditNote(event.target.value)}
                        placeholder="Add note (optional)"
                      />
                    </label>
                  </div>
                  {editError ? (
                    <div className="error" style={{ marginTop: "10px" }}>
                      {editError}
                    </div>
                  ) : null}
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "14px" }}>
                    <Button variant="secondary" size="sm" type="button" onClick={closeEditModal} disabled={editSaving}>
                      Cancel
                    </Button>
                    <Button type="button" size="sm" onClick={saveEdit} disabled={editSaving}>
                      {editSaving ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default TimesheetsAdminPage;



