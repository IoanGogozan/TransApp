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
import TableWrap from "../components/TableWrap";
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

  const showSummary =
    hasPreview && (exportType === "audit" ? rowsCount > 0 : rowsCount > 1);

  return (
    <div className="reports-page">
      <style>
        {`
          .reports-page {
            min-height: 100vh;
            display: flex;
            align-items: flex-start;
            justify-content: flex-start;
            padding: 20px;
          }
          .reports-container {
            margin: 0 auto;
            max-width: 1280px;
            padding: 32px 24px;
            width: 100%;
          }
          .reports-toolbar {
            background: #fff;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
            padding: 16px 18px;
            margin-bottom: 16px;
          }
          .reports-toolbar-row {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 16px;
            flex-wrap: wrap;
          }
          .reports-header {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }
          .reports-header h1,
          .reports-header p {
            margin: 0;
          }
          .reports-toolbar-actions {
            display: flex;
            flex-direction: column;
            gap: 10px;
            align-items: flex-end;
            flex: 1 1 420px;
            min-width: 280px;
          }
          .reports-quick-range {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            justify-content: flex-end;
          }
          .reports-pill {
            background: transparent !important;
            border: 1px solid #d1d5db !important;
            color: #111827 !important;
            border-radius: 999px !important;
            padding: 0 12px !important;
            height: 30px !important;
            font-size: 13px !important;
            font-weight: 600 !important;
            line-height: 30px !important;
          }
          .reports-pill.active {
            background: #2563eb !important;
            border-color: #2563eb !important;
            color: #fff !important;
          }
          .reports-quick-range .reports-pill {
            width: auto !important;
            min-width: 0 !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
          }
          .reports-control-input {
            height: 36px !important;
            padding: 6px 10px !important;
            font-size: 14px !important;
          }
          .reports-control-date {
            min-width: 160px;
          }
          .reports-control-select {
            min-width: 200px;
          }
          .reports-controls {
            display: grid;
            gap: 10px;
            grid-template-columns: 160px 160px 220px 220px;
            justify-content: end;
          }
          .reports-controls .field {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }
          .reports-actions {
            display: flex;
            gap: 8px;
            justify-content: flex-end;
            width: 100%;
          }
          .reports-status {
            margin-bottom: 12px;
            font-size: 14px;
          }
          .reports-card-container {
            background: #fff;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
          }
          .reports-summary {
            padding: 12px 16px;
            border-bottom: 1px solid #f1f5f9;
            font-size: 14px;
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            color: #111827;
          }
          .reports-chip {
            display: inline-flex;
            align-items: center;
            padding: 4px 10px;
            border: 1px solid #e5e7eb;
            background: #f9fafb;
            border-radius: 999px;
            font-size: 13px;
            gap: 6px;
            white-space: nowrap;
          }
.reports-table-wrap {
          }
          .reports-table {
            width: 100%;
            min-width: 900px;
            border-collapse: collapse;
          }
          .reports-table thead th {
            position: sticky;
            top: 0;
            background: #f9fafb;
            z-index: 1;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            text-align: left;
            padding: 10px 12px;
          }
          .reports-table tbody td {
            padding: 8px 12px;
            border-bottom: 1px solid #f1f5f9;
            vertical-align: middle;
          }
          .reports-table tbody tr:nth-child(even) {
            background: #fcfcfd;
          }
          .reports-cell-center {
            text-align: center;
          }
          @media (max-width: 900px) {
            .reports-toolbar-actions {
              align-items: stretch;
            }
            .reports-quick-range {
              justify-content: flex-start;
            }
            .reports-controls {
              grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
            }
            .reports-actions {
              justify-content: flex-start;
              flex-wrap: wrap;
            }
          }
          @media (max-width: 640px) {
            .reports-controls {
              grid-template-columns: 1fr;
            }
          }
        `}
      </style>
      <div className="reports-container">
        <Card className="reports-toolbar">
          <div className="reports-toolbar-row">
            <div className="reports-header">
              <SectionHeader
                title="Reports / Export"
                subtitle="Work entry reports based on driver timesheets."
              />
            </div>
            <div className="reports-toolbar-actions">
              <div className="reports-quick-range">
                <Button
                  variant="secondary"
                  size="sm"
                  className={`reports-pill${activeRange === "last7" ? " active" : ""}`}
                  type="button"
                  onClick={() => applyQuickRange("last7")}
                  disabled={loading || downloading}
                >
                  Last 7 days
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className={`reports-pill${activeRange === "thisWeek" ? " active" : ""}`}
                  type="button"
                  onClick={() => applyQuickRange("thisWeek")}
                  disabled={loading || downloading}
                >
                  This week
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className={`reports-pill${activeRange === "thisMonth" ? " active" : ""}`}
                  type="button"
                  onClick={() => applyQuickRange("thisMonth")}
                  disabled={loading || downloading}
                >
                  This month
                </Button>
              </div>

              <div className="reports-controls">
                <FormField label="From">
                  <Input
                    className="reports-control-input reports-control-date"
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    disabled={loading || downloading}
                  />
                </FormField>
                <FormField label="To">
                  <Input
                    className="reports-control-input reports-control-date"
                    type="date"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    disabled={loading || downloading}
                  />
                </FormField>
                <FormField label="Export type">
                  <select
                    className="reports-control-input reports-control-select"
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
                      className="reports-control-input reports-control-select"
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

              <div className="reports-actions reports-button-row">
                <Button
                  type="button"
                  onClick={handlePreview}
                  disabled={loading || downloading || !hasValidRange}
                >
                  {loading ? "Loading..." : "Preview"}
                </Button>
                <Button
                  variant="secondary"
                  type="button"
                  onClick={handleDownload}
                  disabled={!canDownload}
                >
                  {downloading ? "Preparing..." : "Download CSV"}
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {driverLoadError ? <div className="error">{driverLoadError}</div> : null}

        <ListState
          loading={loading}
          hasItems={hasPreview && items.length > 0}
          emptyTitle="No report data"
          emptyMessage={emptyReportMessage}
          errorMessage={error}
        >
          <TableWrap className="reports-card-container reports-table-wrap">
            {showSummary ? (
              <div className="reports-summary">
                <span className="reports-chip">Rows: {rowsCount}</span>
                <span className="reports-chip">Total: {formatMinutesToHHMM(totalMinutes)}</span>
                {activityTotals.map((entry) => (
                  <span key={entry.key} className="reports-chip">
                    {entry.label}: {formatMinutesToHHMM(entry.minutes)}
                  </span>
                ))}
              </div>
            ) : null}
            <table className="reports-table min-w-[900px] w-full">
              <thead>
                <tr>
                  <th>Date</th>
                  {isPayroll ? (
                    <>
                      <th>Driver</th>
                      <th style={{ textAlign: "right" }}>Total</th>
                      <th style={{ textAlign: "right" }}>Driving</th>
                      <th style={{ textAlign: "right" }}>Other work</th>
                      <th style={{ textAlign: "right" }}>Break</th>
                      <th style={{ textAlign: "right" }}>Availability</th>
                    </>
                  ) : null}
                  {isBilling ? (
                    <>
                      <th>Customer</th>
                      <th>Route</th>
                      <th style={{ textAlign: "right" }}>Total</th>
                      <th>Driver</th>
                      <th>Vehicle</th>
                      <th style={{ textAlign: "right" }}>Entries</th>
                    </>
                  ) : null}
                  {isAudit ? (
                    <>
                      <th>Driver</th>
                      <th>Activity</th>
                      <th style={{ textAlign: "right" }}>Minutes</th>
                      <th>Customer</th>
                      <th>Route</th>
                      <th>Vehicle</th>
                      <th>Note</th>
                      <th>Source</th>
                    </>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {items.map((row, index) => (
                  <tr key={`${row.date}-${row.driverId || "all"}-${row.activityType || index}`}>
                    <td>{row.date}</td>
                    {isPayroll ? (
                      <>
                        <td>{formatDriverLabel(row)}</td>
                        <td style={{ textAlign: "right" }}>{formatMinutesToHHMM(row.minutesTotal)}</td>
                        <td style={{ textAlign: "right" }}>
                          {formatMinutesToHHMM(row.minutesByActivity?.DRIVING || 0)}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          {formatMinutesToHHMM(row.minutesByActivity?.OTHER_WORK || 0)}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          {formatMinutesToHHMM(row.minutesByActivity?.BREAK || 0)}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          {formatMinutesToHHMM(row.minutesByActivity?.AVAILABILITY || 0)}
                        </td>
                      </>
                    ) : null}
                    {isBilling ? (
                      <>
                        <td>{row.customer}</td>
                        <td>{row.route}</td>
                        <td style={{ textAlign: "right" }}>{formatMinutesToHHMM(row.minutesTotal)}</td>
                        <td>{formatDriverLabel(row)}</td>
                        <td>{row.vehicleReg}</td>
                        <td style={{ textAlign: "right" }}>{row.entriesCount}</td>
                      </>
                    ) : null}
                    {isAudit ? (
                      <>
                        <td>{formatDriverLabel(row)}</td>
                        <td>{formatActivityLabel(row.activityType)}</td>
                        <td style={{ textAlign: "right" }}>{formatMinutesToHHMM(row.minutes || 0)}</td>
                        <td>{row.customer}</td>
                        <td>{row.route}</td>
                        <td>{row.vehicleReg}</td>
                        <td>{row.note}</td>
                        <td>{row.source}</td>
                      </>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </ListState>
      </div>
    </div>
  );
};

export default AdminReportsPage;






















