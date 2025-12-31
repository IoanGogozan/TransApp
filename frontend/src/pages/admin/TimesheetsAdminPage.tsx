import { useEffect, useMemo, useState } from "react";
import { ApiError } from "../../api/http";
import { AdminTimesheetRow, getAdminTimesheets } from "../../api/timesheets";

const toDateInput = (d: Date) => d.toISOString().slice(0, 10);

const defaultRange = () => {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - 6);
  return { from: toDateInput(from), to: toDateInput(to) };
};

const minutesToHours = (minutes: number) => Math.round((minutes / 60) * 100) / 100;

const bestIdentifier = (driver: AdminTimesheetRow["driver"]) =>
  driver.email || driver.phone || driver.username || `User ${driver.id}`;

const TimesheetsAdminPage = () => {
  const initialRange = useMemo(() => defaultRange(), []);
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [rows, setRows] = useState<AdminTimesheetRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const exportCsv = () => {
    const header = [
      "Date",
      "Driver",
      "Route",
      "Driving (min)",
      "Other Work (min)",
      "Break (min)",
      "Availability (min)",
      "Total (min)",
    ];
    const lines = rows.map((row) => [
      row.date,
      bestIdentifier(row.driver),
      row.route?.name || "",
      row.totalsMinutes.DRIVING,
      row.totalsMinutes.OTHER_WORK,
      row.totalsMinutes.BREAK,
      row.totalsMinutes.AVAILABILITY,
      row.totalsMinutes.DRIVING + row.totalsMinutes.OTHER_WORK + row.totalsMinutes.BREAK + row.totalsMinutes.AVAILABILITY,
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
    <div className="page">
      <div className="card">
        <h1>Timesheets</h1>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "12px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label>From</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label>To</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: "8px" }}>
            <button className="button" type="button" onClick={load} disabled={loading}>
              {loading ? "Loading..." : "Load"}
            </button>
            <button className="button" type="button" onClick={exportCsv} disabled={rows.length === 0}>
              Export CSV
            </button>
          </div>
        </div>

        {error && <div className="error">{error}</div>}

        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Driver</th>
                <th>Route</th>
                <th>Total</th>
                <th>Breakdown</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center" }}>
                    {loading ? "Loading..." : "No rows"}
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => {
                  const totalMinutes =
                    row.totalsMinutes.DRIVING +
                    row.totalsMinutes.OTHER_WORK +
                    row.totalsMinutes.BREAK +
                    row.totalsMinutes.AVAILABILITY;
                  const breakdown = [
                    { label: "Driving", minutes: row.totalsMinutes.DRIVING },
                    { label: "Other work", minutes: row.totalsMinutes.OTHER_WORK },
                    { label: "Break", minutes: row.totalsMinutes.BREAK },
                    { label: "Availability", minutes: row.totalsMinutes.AVAILABILITY },
                  ].filter((item) => item.minutes > 0);

                  return (
                    <tr key={`${row.date}-${row.driver.id}-${idx}`}>
                      <td>{row.date}</td>
                      <td>{bestIdentifier(row.driver)}</td>
                      <td>{row.route?.name || "-"}</td>
                      <td style={{ fontWeight: 700 }}>{minutesToHours(totalMinutes)}h</td>
                      <td>
                        {breakdown.length === 0 ? (
                          "-"
                        ) : (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                            {breakdown.map((item) => (
                              <span
                                key={item.label}
                                style={{
                                  border: "1px solid #e5e7eb",
                                  borderRadius: "999px",
                                  padding: "2px 8px",
                                  fontSize: "12px",
                                  color: "#374151",
                                  background: "#f9fafb",
                                }}
                              >
                                {item.label} {minutesToHours(item.minutes)}h
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TimesheetsAdminPage;
