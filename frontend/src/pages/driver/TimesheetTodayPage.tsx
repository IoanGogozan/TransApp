import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ApiError } from "../../api/http";
import {
  getMyRoutes,
  getMyTimesheet,
  saveMyTimesheet,
  TimesheetEntryInput,
  RouteOption,
  getMyVehicles,
  VehicleOption,
} from "../../api/timesheets";
import { tenantPath } from "../../utils/tenantPath";

type EntryState = TimesheetEntryInput;

const formatLocalToday = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const TimesheetTodayPage = () => {
  const today = useMemo(() => formatLocalToday(), []);
  const { companySlug } = useParams();
  const slug = companySlug;
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [routeOptionId, setRouteOptionId] = useState<string | null>(null);
  const [vehicleId, setVehicleId] = useState<number | null>(null);
  const [entries, setEntries] = useState<EntryState[]>([]);
  const [overtimeType, setOvertimeType] = useState<"OT_50" | "OT_100" | null>(null);
  const [overtimeReason, setOvertimeReason] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [routesRes, vehiclesRes, ts] = await Promise.all([getMyRoutes(), getMyVehicles(), getMyTimesheet(today)]);
        setRoutes(routesRes.routes || []);
        setVehicles(vehiclesRes.vehicles || []);
        setRouteOptionId(ts.routeOptionId);
        setVehicleId(ts.vehicleId);
        setEntries((ts.entries && ts.entries.length > 0 ? ts.entries : [{ activityType: "DRIVING", start: "08:00", end: "09:00" }]) as EntryState[]);
        setOvertimeType(ts.overtimeType);
        setOvertimeReason(ts.overtimeReason || "");
        setNote(ts.note || "");
      } catch (err) {
        const message = err instanceof ApiError ? err.message : "Failed to load timesheet";
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [today]);

  const handleEntryChange = (idx: number, field: keyof EntryState, value: string) => {
    setEntries((prev) => prev.map((entry, i) => (i === idx ? { ...entry, [field]: value } : entry)));
  };

  const addEntry = () => {
    const last = entries[entries.length - 1];
    const next: EntryState =
      last && last.end
        ? { activityType: last.activityType, start: last.end, end: last.end }
        : { activityType: "DRIVING", start: "08:00", end: "09:00" };
    setEntries((prev) => [...prev, next]);
  };

  const removeEntry = (idx: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    if (overtimeType && !overtimeReason.trim()) {
      setError("Overtime reason is required when overtime type is selected.");
      setSaving(false);
      return;
    }

    try {
      const payload = {
        routeOptionId: routeOptionId || null,
        vehicleId: vehicleId || null,
        note: note.trim() ? note.trim() : null,
        overtimeType,
        overtimeReason: overtimeType ? overtimeReason.trim() : null,
        entries,
      };
      const res = await saveMyTimesheet(today, payload);
      setSuccess("Timesheet saved");
      setEntries(res.entries);
      setRouteOptionId(res.routeOptionId);
      setVehicleId(res.vehicleId);
      setOvertimeType(res.overtimeType);
      setOvertimeReason(res.overtimeReason || "");
      setNote(res.note || "");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to save timesheet";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

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
          <button className="button" onClick={() => window.location.reload()} style={{ width: "auto" }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="card">
        <h1>My Timesheet</h1>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <p className="muted" style={{ margin: 0 }}>
            Today: {today}
          </p>
          <button className="button" type="button" onClick={() => window.location.reload()} style={{ width: "auto" }}>
            Reset
          </button>
        </div>
        {success && <div className="muted">{success}</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "12px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontWeight: 600 }}>Vehicle</label>
            <select
              value={vehicleId ?? ""}
              onChange={(e) => {
                const val = e.target.value;
                setVehicleId(val ? Number(val) : null);
              }}
              style={{ padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db" }}
            >
              <option value="">No vehicle</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.regNumber} {v.name ? `(${v.name})` : ""}
                </option>
              ))}
            </select>
            <button
              className="button"
              type="button"
              onClick={handleSave}
              disabled={saving || !vehicleId}
              style={{ width: "auto" }}
            >
              {saving ? "Saving..." : "Check in"}
            </button>
            <p className="muted" style={{ margin: 0 }}>
              Select a vehicle and check in to save it for today.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontWeight: 600 }}>Route</label>
            <select
              value={routeOptionId || ""}
              onChange={(e) => setRouteOptionId(e.target.value || null)}
              style={{ padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db" }}
            >
              <option value="">None</option>
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>Segments</h3>
              <button className="button" type="button" onClick={addEntry} style={{ width: "auto" }}>
                Add segment
              </button>
            </div>
            {entries.length === 0 && <p className="muted">No segments yet.</p>}
            {entries.map((entry, idx) => (
              <div
                key={idx}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: "10px",
                  padding: "12px",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr auto",
                  gap: "8px",
                  alignItems: "center",
                }}
              >
                <select
                  value={entry.activityType}
                  onChange={(e) => handleEntryChange(idx, "activityType", e.target.value)}
                  style={{ padding: "8px", borderRadius: "8px", border: "1px solid #d1d5db" }}
                >
                  <option value="DRIVING">Driving</option>
                  <option value="OTHER_WORK">Other work</option>
                  <option value="BREAK">Break</option>
                  <option value="AVAILABILITY">Availability</option>
                </select>
                <input
                  type="time"
                  value={entry.start}
                  onChange={(e) => handleEntryChange(idx, "start", e.target.value)}
                  style={{ padding: "8px", borderRadius: "8px", border: "1px solid #d1d5db" }}
                />
                <input
                  type="time"
                  value={entry.end}
                  onChange={(e) => handleEntryChange(idx, "end", e.target.value)}
                  style={{ padding: "8px", borderRadius: "8px", border: "1px solid #d1d5db" }}
                />
                <button className="button" type="button" onClick={() => removeEntry(idx)} style={{ width: "auto" }}>
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontWeight: 600 }}>Overtime</label>
              <select
                value={overtimeType || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setOvertimeType(val ? (val as "OT_50" | "OT_100") : null);
                  if (!val) setOvertimeReason("");
                }}
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db" }}
              >
                <option value="">None</option>
                <option value="OT_50">OT 50%</option>
                <option value="OT_100">OT 100%</option>
              </select>
            </div>
            {overtimeType && (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontWeight: 600 }}>Reason</label>
                <textarea
                  value={overtimeReason}
                  onChange={(e) => setOvertimeReason(e.target.value)}
                  placeholder="Explain overtime"
                  style={{ minHeight: "60px", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db" }}
                />
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontWeight: 600 }}>Note (optional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Notes for today"
              style={{ minHeight: "60px", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db" }}
            />
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button className="button" type="button" onClick={handleSave} disabled={saving} style={{ width: "auto" }}>
              {saving ? "Saving..." : "Save timesheet"}
            </button>
            <Link className="button" to={tenantPath(slug, "/driver/shift")} style={{ width: "auto" }}>
              Back to shift
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimesheetTodayPage;
