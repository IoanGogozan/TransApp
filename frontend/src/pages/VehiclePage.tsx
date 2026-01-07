import { Link, useParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { getVehicleById, updateVehicle } from "../api/vehicles";
import { Vehicle } from "../types/vehicle";
import { ApiError } from "../api/http";
import { tenantPath } from "../utils/tenantPath";

const VehiclePage = () => {
  const { vehicleId, companySlug } = useParams<{ vehicleId: string; companySlug?: string }>();
  const slug = companySlug;
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [regNumber, setRegNumber] = useState("");
  const [name, setName] = useState("");
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const messageTimeoutRef = useRef<number | null>(null);
  const vehiclesPath = "/admin/vehicles";

  useEffect(() => {
    const load = async () => {
      if (!vehicleId) return;
      setLoading(true);
      setLoadError(null);
      try {
        const v = await getVehicleById(vehicleId);
        setVehicle(v);
        setRegNumber(v.regNumber || "");
        setName(v.name || "");
        setActive(v.active !== false);
      } catch (err) {
        const message = err instanceof ApiError ? err.message : "Vehicle not found";
        setLoadError(message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [vehicleId]);

  useEffect(() => (
    () => {
      if (messageTimeoutRef.current) {
        window.clearTimeout(messageTimeoutRef.current);
      }
    }
  ), []);

  const handleSave = async () => {
    if (!vehicleId) return;
    const trimmedRegNumber = regNumber.trim();
    if (!trimmedRegNumber) {
      setSaveError("Registration number is required");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await updateVehicle(Number(vehicleId), {
        regNumber: trimmedRegNumber,
        name: name.trim(),
        active,
      });
      setVehicle(updated);
      setMessage("Saved");
      if (messageTimeoutRef.current) {
        window.clearTimeout(messageTimeoutRef.current);
      }
      messageTimeoutRef.current = window.setTimeout(() => {
        setMessage(null);
        messageTimeoutRef.current = null;
      }, 2000);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to save vehicle";
      setSaveError(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <div className="card">
          <p>Loading vehicle...</p>
        </div>
      </div>
    );
  }

  if (loadError || !vehicle) {
    return (
      <div className="page">
        <div className="card">
          <div className="error">{loadError || "Vehicle not found"}</div>
          <Link className="button" to={tenantPath(slug, vehiclesPath)} style={{ display: "inline-block", width: "auto" }}>
            Back to vehicles
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="card">
        <h1 style={{ marginBottom: "6px" }}>Vehicle</h1>
        <p className="muted">{vehicle.type || "Vehicle"}</p>
        {message && <p className="success">{message}</p>}
        {saveError && <p className="error">{saveError}</p>}
        <div style={{ display: "grid", gap: "12px", marginTop: "12px" }}>
          <label className="field">
            <span>Reg number</span>
            <input
              value={regNumber}
              onChange={(e) => setRegNumber(e.target.value)}
              required
            />
          </label>
          <label className="field">
            <span>Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Active</span>
            <select value={active ? "active" : "inactive"} onChange={(e) => setActive(e.target.value === "active")}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
        </div>
        <div className="row" style={{ marginTop: "12px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button className="button" type="button" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </button>
          <Link className="button secondary" to={tenantPath(slug, vehiclesPath)} style={{ width: "auto" }}>
            Back to vehicles
          </Link>
        </div>
      </div>
    </div>
  );
};

export default VehiclePage;

