import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { startShift, endShift, getMyActiveShift } from "../api/shifts";
import { Shift } from "../types/shift";
import { ApiError } from "../api/http";
import { getActiveVehicleId } from "../driver/activeVehicle";
import { getVehicleById } from "../api/vehicles";

const formatTime = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : "-");

const ShiftPage = () => {
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [vehicleLabel, setVehicleLabel] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);
  const activeVehicleId = getActiveVehicleId();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      setMessage(null);
      try {
        const shift = await getMyActiveShift();
        setActiveShift(shift);
        if (activeVehicleId) {
          try {
            const v = await getVehicleById(activeVehicleId);
            setVehicleLabel(`${v.regNumber}${v.name ? ` (${v.name})` : ""}`);
          } catch (err) {
            setVehicleLabel(`Vehicle ${activeVehicleId}`);
          }
        }
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : "Failed to load shifts";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [activeVehicleId]);

  const handleStart = async (withVehicle: boolean) => {
    setStarting(true);
    setError(null);
    setMessage(null);
    try {
      const vehicleId = withVehicle && activeVehicleId ? activeVehicleId : undefined;
      const shift = await startShift(vehicleId);
      setActiveShift(shift);
      setMessage("Shift started");
    } catch (err) {
      if (err instanceof ApiError && err.code === "CHECKLIST_REQUIRED") {
        setError("Checklist required for this vehicle today.");
        setMessage(null);
      } else if (err instanceof ApiError && err.code === "SHIFT_ALREADY_ACTIVE") {
        const s = await getMyActiveShift();
        setActiveShift(s);
        setError("Shift already active.");
      } else {
        const msg = err instanceof ApiError ? err.message : "Failed to start shift";
        setError(msg);
      }
    } finally {
      setStarting(false);
    }
  };

  const handleEnd = async () => {
    if (!activeShift) return;
    setEnding(true);
    setError(null);
    setMessage(null);
    try {
      const shift = await endShift(activeShift.id);
      setActiveShift(shift);
      setMessage("Shift ended");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to end shift";
      setError(msg);
    } finally {
      setEnding(false);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <div className="card">
          <p>Loading shift...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="card">
        <h1>Driver Shift</h1>
        <p className="muted">Active vehicle: {vehicleLabel || activeVehicleId || "None selected"}</p>
        {message && <p className="muted">{message}</p>}
        {error && <div className="error">{error}</div>}

        {activeShift && !activeShift.endAt ? (
          <>
            <p>Shift ID: {activeShift.id}</p>
            <p>Start: {formatTime(activeShift.startAt)}</p>
            <p>Vehicle ID: {activeShift.vehicleId || "None"}</p>
            <button className="button" style={{ width: "auto" }} disabled={ending} onClick={handleEnd}>
              {ending ? "Ending..." : "End shift"}
            </button>
          </>
        ) : (
          <>
            <p className="muted">No active shift.</p>
            <div className="row" style={{ marginTop: "12px" }}>
              <button className="button" style={{ width: "auto" }} disabled={starting} onClick={() => handleStart(true)}>
                {starting ? "Starting..." : "Start shift (with vehicle)"}
              </button>
              <button className="button" style={{ width: "auto" }} disabled={starting} onClick={() => handleStart(false)}>
                {starting ? "Starting..." : "Start without vehicle"}
              </button>
            </div>
            <Link className="button" to="/driver/checklist" style={{ width: "auto", marginTop: "12px" }}>
              Go to checklist
            </Link>
          </>
        )}
        <div className="row" style={{ marginTop: "12px" }}>
          <Link className="button" to="/driver/timesheet" style={{ width: "auto" }}>
            My Timesheet
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ShiftPage;
