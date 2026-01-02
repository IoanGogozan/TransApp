import { useEffect, useMemo, useState } from "react";
import { ApiError } from "../../api/http";
import { AdminTimesheetRow, WorkRun, getAdminTimesheets, getAdminWorkRunDetails } from "../../api/timesheets";

const toDateInput = (d: Date) => d.toISOString().slice(0, 10);

const defaultRange = () => {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - 6);
  return { from: toDateInput(from), to: toDateInput(to) };
};

const bestIdentifier = (driver: AdminTimesheetRow["driver"]) =>
  driver.username || driver.email || driver.phone || `User ${driver.id}`;

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
  if (items.length === 0) return "—";
  if (items.length <= 2) return items.join(", ");
  return `${items[0]}, ${items[1]} +${items.length - 2}`;
};

const formatTime = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const formatDuration = (start?: string | null, end?: string | null) => {
  if (!start || !end) return "-";
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) return "-";
  return `${Math.round((endMs - startMs) / 60000)} min`;
};

const TimesheetsAdminPage = () => {
  const initialRange = useMemo(() => defaultRange(), []);
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [rows, setRows] = useState<AdminTimesheetRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [detailsRuns, setDetailsRuns] = useState<WorkRun[]>([]);
  const [detailsDriver, setDetailsDriver] = useState<AdminTimesheetRow["driver"] | null>(null);
  const [detailsDate, setDetailsDate] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAdminTimesheets({ from, to });
      setRows(res.timesheets || []);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to load timesheets";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openDetails = async (row: AdminTimesheetRow) => {
    setDetailsOpen(true);
    setDetailsLoading(true);
    setDetailsError(null);
    setDetailsRuns([]);
    setDetailsDriver(row.driver);
    setDetailsDate(row.date);
    try {
      const res = await getAdminWorkRunDetails({ date: row.date, driverId: row.driver.id });
      setDetailsRuns(res.runs || []);
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
    setDetailsDriver(null);
    setDetailsDate(null);
    setDetailsError(null);
  };

  const filteredRows = rows.filter((row) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    const haystack = [
      row.driver.username,
      row.driver.email,
      row.driver.phone,
      String(row.driver.id),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  });
  const showRuns = rows.some((row) => typeof row.runsCount === "number");

  const exportCsv = () => {
    const header = [
      "Date",
      "Driver",
      "Vehicles",
      "Routes",
      "Driving (min)",
      "Other Work (min)",
      "Break (min)",
      "Availability (min)",
      "Total (min)",
      "Runs",
    ];
    const lines = rows.map((row) => [
      row.date,
      driverLabel(row.driver),
      row.vehicles.map((vehicle) => vehicle.regNumber).join("; "),
      row.routes.map((route) => route.name).join("; "),
      row.totalsMinutes.DRIVING,
      row.totalsMinutes.OTHER_WORK,
      row.totalsMinutes.BREAK,
      row.totalsMinutes.AVAILABILITY,
      row.totalsMinutes.DRIVING + row.totalsMinutes.OTHER_WORK + row.totalsMinutes.BREAK + row.totalsMinutes.AVAILABILITY,
      row.runsCount,
    ]);
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
    <div className="page timesheets-page">
      <style>
        {`
          .timesheets-page {
            align-items: flex-start;
            justify-content: flex-start;
          }
          .timesheets-container {
            margin: 0 auto;
            max-width: 1280px;
            padding: 32px 24px;
          }
          .timesheets-topcard {
            background: #fff;
            border: 1px solid #e5e7eb;
            border-radius: 16px;
            padding: 24px;
            box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
            margin-bottom: 20px;
          }
          .timesheets-page .button {
            width: auto;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 10px 14px;
            font-size: 14px;
            font-weight: 700;
          }
          .timesheets-page .timesheets-filters .button {
            padding: 10px 16px;
            min-width: 110px;
          }
          .timesheets-page .timesheets-table .button {
            padding: 8px 12px;
            min-width: 110px;
          }
          .timesheets-topbar {
            display: flex;
            gap: 16px;
            align-items: flex-end;
            justify-content: space-between;
            flex-wrap: wrap;
            margin-bottom: 16px;
          }
          .timesheets-filters {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            align-items: flex-end;
          }
          .timesheets-field {
            display: flex;
            flex-direction: column;
            gap: 4px;
            min-width: 160px;
          }
          .timesheets-field.search {
            min-width: 240px;
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
            overflow: auto;
            background: #fff;
          }
          .timesheets-modal .timesheets-modal-table table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
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
          .timesheets-modal .button {
            width: auto;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 8px 12px;
            font-size: 14px;
            font-weight: 700;
            min-width: 96px;
            border-radius: 12px;
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
            overflow: auto;
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
          }
          .timesheets-table tbody tr:nth-child(even) {
            background: #fcfcfd;
          }
          .timesheets-table td {
            vertical-align: middle;
            padding: 8px 12px;
            border-bottom: 1px solid #f1f5f9;
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
        <div className="timesheets-topcard">
          <div className="timesheets-topbar">
            <div>
              <h1 style={{ marginBottom: "4px" }}>Timesheets</h1>
                    <p className="timesheets-modal-subtitle">
                {from} to {to}
              </p>
            </div>
            <div className="timesheets-filters">
              <div className="timesheets-field">
                <label>From</label>
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              </div>
              <div className="timesheets-field">
                <label>To</label>
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
              <div className="timesheets-field search">
                <label>Search driver</label>
                <input
                  type="text"
                  placeholder="Name, email, phone, ID"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: "6px" }}>
                <button className="button" type="button" onClick={load} disabled={loading}>
                  {loading ? "Loading..." : "Load"}
                </button>
                <button className="button" type="button" onClick={exportCsv} disabled={rows.length === 0}>
                  Export CSV
                </button>
              </div>
            </div>
          </div>
        </div>

        {error && <div className="error">{error}</div>}

        <div className="timesheets-desktop">
          <div className="timesheets-table-wrap">
            <table className="table timesheets-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Driver</th>
                  <th>Vehicles</th>
                  <th>Routes</th>
                  {showRuns ? <th>Runs</th> : null}
                  <th>Total</th>
                  <th>Breakdown</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={showRuns ? 8 : 7} style={{ textAlign: "center" }}>
                      {loading ? "Loading..." : "No rows"}
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row, idx) => {
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
                            <strong>{bestIdentifier(row.driver)}</strong>
                            <span className="muted">
                              {[
                                row.driver.phone || row.driver.email || null,
                                `id:${row.driver.id}`,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          </div>
                        </td>
                        <td>{vehiclesLabel}</td>
                        <td>{routesLabel}</td>
                        {showRuns ? <td>{row.runsCount}</td> : null}
                        <td style={{ fontWeight: 700 }}>{formatTotal(totalMinutes)}</td>
                        <td>
                          <div className="timesheets-breakdown">
                            {breakdown.map((item) => (
                              <span key={item.label}>
                                <strong>{item.label}:</strong> {formatDurationHours(item.minutes)}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td>
                          <button className="button" type="button" onClick={() => openDetails(row)}>
                            Details
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="timesheets-mobile">
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {filteredRows.length === 0 ? (
              <div className="card" style={{ textAlign: "center" }}>
                {loading ? "Loading..." : "No rows"}
              </div>
            ) : (
              filteredRows.map((row, idx) => {
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
                  <div key={`${row.date}-${row.driver.id}-${idx}`} className="card">
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", flexWrap: "wrap" }}>
                      <div>
                        <strong>{row.date}</strong>
                        <div className="muted">{driverLabel(row.driver)}</div>
                        {row.driver.phone ? <div className="muted">{row.driver.phone}</div> : null}
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 700 }}>{formatTotal(totalMinutes)}</div>
                        {showRuns ? <div className="muted">{row.runsCount} runs</div> : null}
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
                      <button className="button" type="button" onClick={() => openDetails(row)}>
                        Details
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
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
              <button className="button timesheets-modal-close" type="button" onClick={closeDetails}>
                Close
              </button>
            </div>

            {detailsError ? <div className="error" style={{ marginTop: "12px" }}>{detailsError}</div> : null}

            <div className="timesheets-modal-table" style={{ marginTop: "12px" }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Start</th>
                    <th>End</th>
                    <th>Duration</th>
                    <th>Activity</th>
                    <th>Customer</th>
                    <th>Route</th>
                    <th>Vehicle</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {detailsRuns.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: "center" }}>
                        {detailsLoading ? "Loading..." : "No runs"}
                      </td>
                    </tr>
                  ) : (
                    detailsRuns.map((run) => (
                      <tr key={run.id}>
                        <td>{formatTime(run.startedAt)}</td>
                        <td>{formatTime(run.endedAt)}</td>
                        <td>{formatDuration(run.startedAt, run.endedAt)}</td>
                        <td>{run.activityType}</td>
                        <td>{run.customerOption?.name || "-"}</td>
                        <td>{run.routeOption?.name || "-"}</td>
                        <td>{run.vehicle?.regNumber || "-"}</td>
                        <td>
                          <button
                            className="button"
                            type="button"
                            onClick={() => {
                              // Placeholder for upcoming edit flow.
                              // eslint-disable-next-line no-console
                              console.log("edit run", run.id);
                            }}
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default TimesheetsAdminPage;
