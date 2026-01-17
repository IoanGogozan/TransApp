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
            .map((ci) => `${ci.regNumber || `Vehicle#${ci.vehicleId}`} ${timeFmt.format(new Date(ci.checkedAt))} • ${ci.allOk ? "OK" : "Issues"}`)
            .join("; ") || "—"
          : "—";
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
    <div className="timesheets-page">
      <style>
        {`
          .timesheets-page {
            min-height: 100vh;
            width: 100%;
            padding: 12px;
          }
          @media (min-width: 640px) {
            .timesheets-page {
              padding: 20px;
            }
          }
          .timesheets-container {
            width: 100%;
            margin: 0 auto;
            max-width: 1280px;
            padding: 0;
          }
          @media (min-width: 640px) {
            .timesheets-container {
              padding: 24px 16px;
            }
          }
          .timesheets-topcard {
            background: #fff;
            border: 1px solid #e5e7eb;
            border-radius: 16px;
            padding: 24px;
            box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
            margin-bottom: 20px;
          }
          .quick-btn {
            background: #f1f5f9;
            color: #0f172a;
            border: 1px solid #e2e8f0;
          }
          .quick-btn.quick-btn-active {
            background: #2563eb;
            color: #fff;
            border: 1px solid #2563eb;
          }
          .timesheets-modal {
            background: #fff;
            border-radius: 16px;
            border: 1px solid #e5e7eb;
            box-shadow: 0 20px 60px rgba(15, 23, 42, 0.18);
            padding: 24px;
            max-width: 1100px;
            width: calc(100vw - 96px);
          }
          .timesheets-modal-header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 16px;
            margin-bottom: 16px;
          }
          .timesheets-modal-title {
            font-size: 32px;
            font-weight: 800;
            line-height: 1.1;
            margin: 0;
          }
          .timesheets-modal-subtitle {
            margin-top: 6px;
            color: #64748b;
          }
          .timesheets-modal-close {
            padding: 10px 14px;
            font-size: 14px;
            border-radius: 12px;
            width: auto;
          }
          .timesheets-modal .timesheets-modal-table {
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            background: #fff;
          }
          .timesheets-modal .timesheets-modal-table table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
          }
          .timesheets-modal .timesheets-modal-table.compact thead th {
            padding: 8px 10px;
            font-size: 11px;
          }
          .timesheets-modal .timesheets-modal-table.compact tbody td {
            padding: 8px 10px;
            font-size: 13px;
          }
          .timesheets-modal .timesheets-modal-table thead th {
            background: #f9fafb;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            padding: 12px 14px;
          }
          .timesheets-modal .timesheets-modal-table tbody td {
            padding: 14px;
            border-top: 1px solid #f1f5f9;
          }
          @media (max-width: 640px) {
            .timesheets-modal {
              width: calc(100vw - 24px);
              padding: 16px;
            }
            .timesheets-modal .timesheets-modal-table {
              border-radius: 10px;
            }
          }
          .timesheets-table-wrap {
            max-height: 70vh;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            background: #fff;
            box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
          }
          .timesheets-table thead th {
            position: sticky;
            top: 0;
            background: #f9fafb;
            z-index: 1;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            text-align: left;
            padding: 10px 12px;
            border-bottom: 1px solid #f1f5f9;
          }
          .timesheets-table tbody tr:nth-child(even) {
            background: #eef2ff;
          }
          .timesheets-table td {
            vertical-align: middle;
            padding: 10px 12px;
            border-bottom: 1px solid #f1f5f9;
            text-align: left;
          }
          .timesheets-table thead th:last-child,
          .timesheets-table tbody td:last-child {
            text-align: center;
          }
          .timesheets-table thead th:not(:last-child),
          .timesheets-table tbody td:not(:last-child) {
            border-right: 1px solid #f1f5f9;
          }
          .timesheets-driver {
            display: flex;
            flex-direction: column;
            gap: 2px;
            min-width: 200px;
          }
          .timesheets-driver span {
            word-break: break-word;
          }
          .timesheets-breakdown {
            display: grid;
            grid-template-columns: repeat(4, minmax(70px, 1fr));
            gap: 6px;
            font-size: 12px;
            color: #374151;
            white-space: nowrap;
          }
          .timesheets-breakdown span {
            display: inline-flex;
            gap: 4px;
          }
          .timesheets-desktop {
            display: none;
          }
          .timesheets-mobile {
            display: block;
          }
          @media (min-width: 768px) {
            .timesheets-desktop {
              display: block;
            }
            .timesheets-mobile {
              display: none;
            }
          }
        `} 
      </style>
      <div className="timesheets-container">
        <Card className="timesheets-topcard w-full max-w-none">
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
                  className={`quick-btn ${activeQuickRange === "WEEK" ? "quick-btn-active" : ""}`}
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
                  className={`quick-btn ${activeQuickRange === "MONTH" ? "quick-btn-active" : ""}`}
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
          <div className="timesheets-desktop">
            <TableWrap className="timesheets-table-wrap">
              <table className="table timesheets-table min-w-[900px] w-full">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Driver</th>
                    <th>Vehicles</th>
                    <th>Routes</th>
                    {showRuns ? <th>Entries</th> : null}
                    <th>Total</th>
                    <th>Breakdown</th>
                    <th>Actions</th>
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
                      <tr key={`${row.date}-${row.driver.id}-${idx}`}>
                        <td>{row.date}</td>
                        <td>
                          <div className="timesheets-driver">
                            {bestIdentifier(row.driver)}
                          </div>
                        </td>
                        <td>
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
                        <td>
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
                        {showRuns ? <td>{row.entriesCount}</td> : null}
                        <td style={{ fontWeight: 700 }}>{formatTotal(totalMinutes)}</td>
                        <td>
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
                        <td>
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

          <div className="timesheets-mobile">
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
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
                  <Card key={`${row.date}-${row.driver.id}-${idx}`} className="timesheets-mobile-card w-full max-w-none">
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", flexWrap: "wrap" }}>
                      <div>
                        <strong>{row.date}</strong>
                        <div className="muted">{bestIdentifier(row.driver)}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 700 }}>{formatTotal(totalMinutes)}</div>
                        {showRuns ? <div className="muted">{row.entriesCount} entries</div> : null}
                      </div>
                    </div>
                    <div style={{ marginTop: "10px" }}>
                      <div className="muted" style={{ marginBottom: "4px" }}>Vehicles</div>
                      {row.vehicles.length === 0 ? (
                        <div>-</div>
                      ) : (
                        <div className="timesheets-chips">
                          {row.vehicles.map((vehicle) => (
                            <span key={vehicle.id} className="timesheets-chip">
                              {vehicle.regNumber}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{ marginTop: "10px" }}>
                      <div className="muted" style={{ marginBottom: "4px" }}>Routes</div>
                      {row.routes.length === 0 ? (
                        <div>-</div>
                      ) : (
                        <div className="timesheets-chips">
                          {row.routes.map((route) => (
                            <span key={route.id} className="timesheets-chip">
                              {route.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{ marginTop: "10px" }}>
                      <div className="muted" style={{ marginBottom: "4px" }}>Breakdown</div>
                      {breakdown.length === 0 ? (
                        <div>-</div>
                      ) : (
                        <div className="timesheets-chips">
                          {breakdown.map((item) => (
                            <span key={item.label} className="timesheets-chip">
                              {item.label} {formatDurationHours(item.minutes)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{ marginTop: "12px" }}>
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
            className="timesheets-modal"
            style={{
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
              <div className="timesheets-modal-header">
              <div>
                <h2 className="timesheets-modal-title">Work run details</h2>
                {detailsDriver && detailsDate ? (
                  <p className="muted" style={{ margin: 0 }}>
                    {detailsDate} · {driverLabel(detailsDriver)}
                  </p>
                ) : null}
              </div>
              <Button
                variant="ghost"
                size="sm"
                type="button"
                className="timesheets-modal-close"
                onClick={closeDetails}
              >
                Close
              </Button>
            </div>

            {detailsError ? <div className="error" style={{ marginTop: "12px" }}>{detailsError}</div> : null}

            <div style={{ marginTop: "12px" }}>
              <TableWrap className="timesheets-modal-table compact">
                <table className="table min-w-[900px] w-full" style={{ tableLayout: "fixed", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ width: "120px", padding: "8px 10px", textAlign: "left", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>Activity</th>
                      <th style={{ width: "180px", padding: "8px 10px", textAlign: "left", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>Customer</th>
                      <th style={{ width: "160px", padding: "8px 10px", textAlign: "left", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>Route</th>
                      <th style={{ width: "120px", padding: "8px 10px", textAlign: "left", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>Vehicle</th>
                      <th style={{ width: "210px", padding: "8px 10px", textAlign: "left", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>Check-in</th>
                      <th style={{ width: "90px", padding: "8px 10px", textAlign: "left", borderBottom: "1px solid rgba(0,0,0,0.08)", whiteSpace: "nowrap" }}>Duration</th>
                      <th style={{ width: "110px", padding: "8px 10px", textAlign: "left", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailsRuns.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: "center", padding: "8px 10px", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
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
                          <td style={{ padding: "8px 10px", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>{run.activityType}</td>
                          <td style={{ padding: "8px 10px", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>{run.customer?.name || "-"}</td>
                          <td style={{ padding: "8px 10px", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>{run.route?.name || "-"}</td>
                          <td style={{ padding: "8px 10px", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>{vehicleLabel}</td>
                          <td style={{ padding: "8px 10px", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>{checkInLabel}</td>
                          <td style={{ padding: "8px 10px", borderBottom: "1px solid rgba(0,0,0,0.08)", whiteSpace: "nowrap" }}>{formatDurationMinutes(run.durationMin)}</td>
                          <td style={{ padding: "8px 10px", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
                            <button
                              type="button"
                              onClick={() => openEditModal(run)}
                              aria-label="Edit entry"
                              title="Edit"
                              style={{
                                width: "36px",
                                height: "36px",
                                padding: 0,
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                borderRadius: "10px",
                                border: "1px solid #e2e8f0",
                                background: "#f8fafc",
                                color: "#334155",
                              }}
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
