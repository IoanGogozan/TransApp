import { useEffect, useMemo, useState } from "react";
import { ApiError } from "../api/http";
import { listCompanyUsers } from "../api/users";
import {
  getWorkEntriesReport,
  downloadWorkEntriesCsv,
  WorkEntriesItem,
  WorkEntriesTotals,
  WorkEntriesGroupBy,
} from "../api/reports";
import { useAuth } from "../auth/AuthContext";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import FormField from "../components/ui/FormField";
import Input from "../components/ui/Input";
import ListState from "../components/ui/ListState";
import SectionHeader from "../components/ui/SectionHeader";

const formatDate = (date: Date) => date.toISOString().slice(0, 10);

const defaultFromTo = () => {
  const today = new Date();
  const to = formatDate(today);
  const fromDate = new Date(today);
  fromDate.setDate(fromDate.getDate() - 6);
  return { from: formatDate(fromDate), to };
};

const activityOrder = ["DRIVING", "OTHER_WORK", "BREAK", "AVAILABILITY"] as const;
const activityLabels: Record<(typeof activityOrder)[number], string> = {
  DRIVING: "Driving",
  OTHER_WORK: "Other work",
  BREAK: "Break",
  AVAILABILITY: "Availability",
};

const formatMinutesToHHMM = (value?: number | null) => {
  const minutes = Math.max(0, Math.round(value || 0));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
};
const formatActivityLabel = (activity?: string | null) => {
  if (!activity) return "Unknown";
  if (activity === "DRIVING") return "Driving";
  if (activity === "OTHER_WORK") return "Other work";
  if (activity === "BREAK") return "Break";
  if (activity === "AVAILABILITY") return "Availability";
  return activity
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};
const formatDriverLabel = (row: WorkEntriesItem) => {
  if (row.driver) return row.driver;
  if (row.driverId != null) return `Driver ${row.driverId}`;
  return "-";
};

const toLocalDate = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const toDateInputValue = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;

const startOfWeek = (date: Date) => {
  const local = toLocalDate(date);
  const day = local.getDay();
  const diff = (day + 6) % 7;
  local.setDate(local.getDate() - diff);
  return local;
};

const endOfWeek = (date: Date) => {
  const start = startOfWeek(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return end;
};

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
const endOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0);

const AdminReportsPage = () => {
  const { user } = useAuth();
  const defaults = useMemo(() => defaultFromTo(), []);
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const [exportType, setExportType] = useState<"payroll" | "billing" | "audit">("payroll");
  const [driverId, setDriverId] = useState<string>("");
  const [drivers, setDrivers] = useState<Array<{ id: number; label: string }>>([]);
  const [driverLoadError, setDriverLoadError] = useState<string | null>(null);
  const [items, setItems] = useState<WorkEntriesItem[]>([]);
  const [totals, setTotals] = useState<WorkEntriesTotals | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPreview, setHasPreview] = useState(false);
  const [activeRange, setActiveRange] = useState<"last7" | "thisWeek" | "thisMonth" | null>(null);

  useEffect(() => {
    if (!user || user.role === "DRIVER") return;
    const loadDrivers = async () => {
      setDriverLoadError(null);
      try {
        const users = await listCompanyUsers();
        const filtered = users
          .filter((u) => u.role === "DRIVER")
          .map((u) => ({
            id: Number(u.id),
            label: u.email || u.phone || u.username || `Driver ${u.id}`,
          }));
        setDrivers(filtered);
      } catch (err) {
        const message = err instanceof ApiError ? err.message : "Failed to load drivers.";
        setDriverLoadError(message);
      }
    };
    loadDrivers();
  }, [user]);

  const groupBy = useMemo<WorkEntriesGroupBy>(() => {
    if (exportType === "billing") return "day_customer_route";
    if (exportType === "audit") return "entry";
    return "day_driver";
  }, [exportType]);

  const params = useMemo(
    () => ({
      from,
      to,
      groupBy,
      driverId: driverId || undefined,
    }),
    [from, to, groupBy, driverId],
  );

  const handlePreview = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getWorkEntriesReport(params);
      setItems(res.items || []);
      setTotals(res.totals || null);
      setHasPreview(true);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to load report.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    setError(null);
    try {
      const blob = await downloadWorkEntriesCsv(params);
      const url = window.URL.createObjectURL(blob);
      const filename = `transapp-work-entries-from-${from}-to-${to}.csv`;
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to download CSV.";
      setError(message);
    } finally {
      setDownloading(false);
    }
  };

  const isPayroll = exportType === "payroll";
  const isBilling = exportType === "billing";
  const isAudit = exportType === "audit";
  const hasValidRange = Boolean(from) && Boolean(to) && from <= to;
  const canDownload = hasValidRange && hasPreview && !loading && !downloading;
  const rowsCount = items.length;
  const totalMinutes =
    totals?.minutesTotal ?? items.reduce((sum, row) => sum + (row.minutesTotal || row.minutes || 0), 0);
  const activityTotals = activityOrder.map((key) => ({
    key,
    label: activityLabels[key],
    minutes: totals?.minutesByActivity?.[key] ?? 0,
  }));

  const applyQuickRange = (range: "last7" | "thisWeek" | "thisMonth") => {
    const today = toLocalDate(new Date());
    setActiveRange(range);
    if (range === "last7") {
      const fromDate = new Date(today);
      fromDate.setDate(fromDate.getDate() - 6);
      setFrom(toDateInputValue(fromDate));
      setTo(toDateInputValue(today));
      return;
    }
    if (range === "thisWeek") {
      setFrom(toDateInputValue(startOfWeek(today)));
      setTo(toDateInputValue(endOfWeek(today)));
      return;
    }
    setFrom(toDateInputValue(startOfMonth(today)));
    setTo(toDateInputValue(endOfMonth(today)));
  };

  const emptyReportMessage = hasPreview ? "No data for selected range." : "Run preview to see results.";
  const hasItems = hasPreview && items.length > 0;

  const showSummary =
    hasPreview && (exportType === "audit" ? rowsCount > 0 : rowsCount > 1);

  return (
    <div className="min-h-screen w-full px-3 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto w-full max-w-6xl">
        <Card className="w-full rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-xl font-bold text-slate-900">Reports / Export</div>
              <div className="mt-1 text-sm text-slate-600">Work entry reports based on driver timesheets.</div>
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <Button
                variant="secondary"
                size="sm"
                className={`text-sm rounded-full ${activeRange === "last7" ? "bg-blue-600 text-white border-blue-600" : ""}`}
                type="button"
                onClick={() => applyQuickRange("last7")}
                disabled={loading || downloading}
              >
                Last 7 days
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className={`text-sm rounded-full ${activeRange === "thisWeek" ? "bg-blue-600 text-white border-blue-600" : ""}`}
                type="button"
                onClick={() => applyQuickRange("thisWeek")}
                disabled={loading || downloading}
              >
                This week
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className={`text-sm rounded-full ${activeRange === "thisMonth" ? "bg-blue-600 text-white border-blue-600" : ""}`}
                type="button"
                onClick={() => applyQuickRange("thisMonth")}
                disabled={loading || downloading}
              >
                This month
              </Button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 items-end">
            <FormField label="From">
              <Input
                className="w-full"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                disabled={loading || downloading}
              />
            </FormField>
            <FormField label="To">
              <Input
                className="w-full"
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                disabled={loading || downloading}
              />
            </FormField>
            <FormField label="Export type">
              <select
                className="w-full"
                value={exportType}
                onChange={(e) => setExportType(e.target.value as typeof exportType)}
                disabled={loading || downloading}
              >
                <option value="payroll">Payroll</option>
                <option value="billing">Billing (Customer + Route)</option>
                <option value="audit">Audit (Detailed entries)</option>
              </select>
            </FormField>
            {user?.role !== "DRIVER" ? (
              <FormField label="Driver">
                <select
                  className="w-full"
                  value={driverId}
                  onChange={(e) => setDriverId(e.target.value)}
                  disabled={loading || downloading}
                >
                  <option value="">All drivers</option>
                  {drivers.map((driver) => (
                    <option key={driver.id} value={driver.id}>
                      {driver.label}
                    </option>
                  ))}
                </select>
              </FormField>
            ) : null}
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              onClick={handlePreview}
              disabled={loading || downloading || !hasValidRange}
              className="w-full sm:w-auto"
            >
              {loading ? "Loading..." : "Preview"}
            </Button>
            <Button
              variant="secondary"
              type="button"
              onClick={handleDownload}
              disabled={!canDownload}
              className="w-full sm:w-auto"
            >
              {downloading ? "Preparing..." : "Download CSV"}
            </Button>
          </div>
        </Card>

        <div className="mt-4">
          {driverLoadError ? <div className="error">{driverLoadError}</div> : null}

          {!loading && !error && !hasItems ? (
            <div className="w-full rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
              <div className="text-sm font-semibold text-slate-900">No report data</div>
              <div className="mt-1 text-sm text-slate-600">{emptyReportMessage}</div>
            </div>
          ) : (
            <ListState
              loading={loading}
              hasItems={hasItems}
              emptyTitle="No report data"
              emptyMessage={emptyReportMessage}
              errorMessage={error}
            >
              <div className="mt-4 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                {showSummary ? (
                  <div className="flex flex-wrap gap-2 border-b border-slate-200 px-4 py-3 text-sm text-slate-900">
                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium">
                      Rows: {rowsCount}
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium">
                      Total: {formatMinutesToHHMM(totalMinutes)}
                    </span>
                    {activityTotals.map((entry) => (
                      <span key={entry.key} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium">
                        {entry.label}: {formatMinutesToHHMM(entry.minutes)}
                      </span>
                    ))}
                  </div>
                ) : null}
                <div className="overflow-x-auto">
                  <table className="min-w-[900px] w-full text-sm">
                  <thead>
                    <tr>
                      <th className="sticky top-0 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600 px-4 py-3 text-left">Date</th>
                      {isPayroll ? (
                        <>
                          <th className="sticky top-0 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600 px-4 py-3 text-left">Driver</th>
                          <th className="sticky top-0 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600 px-4 py-3 text-right">Total</th>
                          <th className="sticky top-0 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600 px-4 py-3 text-right">Driving</th>
                          <th className="sticky top-0 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600 px-4 py-3 text-right">Other work</th>
                          <th className="sticky top-0 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600 px-4 py-3 text-right">Break</th>
                          <th className="sticky top-0 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600 px-4 py-3 text-right">Availability</th>
                        </>
                      ) : null}
                      {isBilling ? (
                        <>
                          <th className="sticky top-0 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600 px-4 py-3 text-left">Customer</th>
                          <th className="sticky top-0 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600 px-4 py-3 text-left">Route</th>
                          <th className="sticky top-0 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600 px-4 py-3 text-right">Total</th>
                          <th className="sticky top-0 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600 px-4 py-3 text-left">Driver</th>
                          <th className="sticky top-0 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600 px-4 py-3 text-left">Vehicle</th>
                          <th className="sticky top-0 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600 px-4 py-3 text-right">Entries</th>
                        </>
                      ) : null}
                      {isAudit ? (
                        <>
                          <th className="sticky top-0 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600 px-4 py-3 text-left">Driver</th>
                          <th className="sticky top-0 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600 px-4 py-3 text-left">Activity</th>
                          <th className="sticky top-0 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600 px-4 py-3 text-right">Minutes</th>
                          <th className="sticky top-0 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600 px-4 py-3 text-left">Customer</th>
                          <th className="sticky top-0 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600 px-4 py-3 text-left">Route</th>
                          <th className="sticky top-0 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600 px-4 py-3 text-left">Vehicle</th>
                          <th className="sticky top-0 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600 px-4 py-3 text-left">Note</th>
                          <th className="sticky top-0 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600 px-4 py-3 text-left">Source</th>
                        </>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((row, index) => (
                      <tr
                        key={`${row.date}-${row.driverId || "all"}-${row.activityType || index}`}
                        className="odd:bg-white even:bg-slate-50"
                      >
                        <td className="px-4 py-3 text-sm text-slate-900">{row.date}</td>
                        {isPayroll ? (
                          <>
                            <td className="px-4 py-3 text-sm text-slate-900">{formatDriverLabel(row)}</td>
                            <td className="px-4 py-3 text-sm text-slate-900 text-right">{formatMinutesToHHMM(row.minutesTotal)}</td>
                            <td className="px-4 py-3 text-sm text-slate-900 text-right">
                              {formatMinutesToHHMM(row.minutesByActivity?.DRIVING || 0)}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-900 text-right">
                              {formatMinutesToHHMM(row.minutesByActivity?.OTHER_WORK || 0)}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-900 text-right">
                              {formatMinutesToHHMM(row.minutesByActivity?.BREAK || 0)}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-900 text-right">
                              {formatMinutesToHHMM(row.minutesByActivity?.AVAILABILITY || 0)}
                            </td>
                          </>
                        ) : null}
                        {isBilling ? (
                          <>
                            <td className="px-4 py-3 text-sm text-slate-900">{row.customer}</td>
                            <td className="px-4 py-3 text-sm text-slate-900">{row.route}</td>
                            <td className="px-4 py-3 text-sm text-slate-900 text-right">{formatMinutesToHHMM(row.minutesTotal)}</td>
                            <td className="px-4 py-3 text-sm text-slate-900">{formatDriverLabel(row)}</td>
                            <td className="px-4 py-3 text-sm text-slate-900">{row.vehicleReg}</td>
                            <td className="px-4 py-3 text-sm text-slate-900 text-right">{row.entriesCount}</td>
                          </>
                        ) : null}
                        {isAudit ? (
                          <>
                            <td className="px-4 py-3 text-sm text-slate-900">{formatDriverLabel(row)}</td>
                            <td className="px-4 py-3 text-sm text-slate-900">{formatActivityLabel(row.activityType)}</td>
                            <td className="px-4 py-3 text-sm text-slate-900 text-right">{formatMinutesToHHMM(row.minutes || 0)}</td>
                            <td className="px-4 py-3 text-sm text-slate-900">{row.customer}</td>
                            <td className="px-4 py-3 text-sm text-slate-900">{row.route}</td>
                            <td className="px-4 py-3 text-sm text-slate-900">{row.vehicleReg}</td>
                            <td className="px-4 py-3 text-sm text-slate-900">{row.note}</td>
                            <td className="px-4 py-3 text-sm text-slate-900">{row.source}</td>
                          </>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                  </table>
                </div>
              </div>
            </ListState>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminReportsPage;
























