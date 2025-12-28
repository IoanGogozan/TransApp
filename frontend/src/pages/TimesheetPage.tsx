import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMyTimesheetToday } from "../api/reports";
import { ApiError } from "../api/http";
import { formatMinutes } from "../utils/time";
import { getMyActiveShift } from "../api/shifts";
import { Shift } from "../types/shift";

const calcDurationMinutes = (shift: Shift): number => {
  const start = new Date(shift.startAt).getTime();
  const end = shift.endAt ? new Date(shift.endAt).getTime() : Date.now();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 0;
  return Math.floor((end - start) / 60000);
};

const TimesheetPage = () => {
  const [rows, setRows] = useState<Array<{ date: string; minutes: number; hours?: number }>>([]);
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [report, active] = await Promise.all([getMyTimesheetToday(), getMyActiveShift()]);
        setRows(report.items || []);
        setTotalMinutes(report.totalMinutes || 0);
        setActiveShift(active);
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : "Failed to load timesheet";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="page">
        <div className="card">
          <p>Loading timesheet...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="card">
          <div className="error">{error}</div>
          <Link className="button" to="/driver/shift" style={{ width: "auto" }}>
            Back to shift
          </Link>
        </div>
      </div>
    );
  }

  const activeMinutes = activeShift ? calcDurationMinutes(activeShift) : 0;
  const totalWithActive = totalMinutes + activeMinutes;

  return (
    <div className="page">
      <div className="card">
        <h1>Timesheet</h1>
        <p className="muted">Today</p>
        <p>Total: {formatMinutes(totalWithActive)}</p>

        {activeShift && (
          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: "10px",
              padding: "12px",
              marginBottom: "12px",
            }}
          >
            <div style={{ fontWeight: 600 }}>Active shift</div>
            <div className="muted">Duration so far: {formatMinutes(activeMinutes)}</div>
            <div className="muted">Vehicle: {activeShift.vehicleId || "None"}</div>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {rows.length === 0 && !activeShift ? (
            <p className="muted">No shifts today.</p>
          ) : (
            rows.map((row, idx) => (
              <div
                key={idx}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: "10px",
                  padding: "10px",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "8px",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>Date</div>
                  <div className="muted">{row.date || "Today"}</div>
                </div>
                <div>
                  <div style={{ fontWeight: 600 }}>Duration</div>
                  <div className="muted">{formatMinutes(row.minutes ?? 0)}</div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="row" style={{ marginTop: "16px" }}>
          <Link className="button" to="/driver/shift" style={{ width: "auto" }}>
            Back to Shift
          </Link>
        </div>
      </div>
    </div>
  );
};

export default TimesheetPage;
