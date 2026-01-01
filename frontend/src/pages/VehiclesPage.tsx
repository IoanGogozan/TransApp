import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createVehicle, listVehicles } from "../api/vehicles";
import { Vehicle } from "../types/vehicle";
import { ApiError } from "../api/http";
import { tenantPath } from "../utils/tenantPath";

const VehiclesPage = () => {
  const navigate = useNavigate();
  const { companySlug } = useParams();
  const slug = companySlug;
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState({
    regNumber: "",
    name: "",
    type: "",
    active: true,
  });

  useEffect(() => {
    const fetchVehicles = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await listVehicles();
        setVehicles(data);
      } catch (err) {
        const message = err instanceof ApiError ? err.message : "Failed to load vehicles";
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    fetchVehicles();
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const reg = form.regNumber.trim();
    if (reg.length < 2 || reg.length > 20) {
      setError("Registration number must be between 2 and 20 characters.");
      return;
    }

    setSaving(true);
    try {
      const body = {
        regNumber: reg,
        name: form.name.trim() || reg,
        type: form.type.trim() || "Vehicle",
        active: form.active,
      };
      await createVehicle(body);
      setForm({ regNumber: "", name: "", type: "", active: true });
      setSuccess("Vehicle created");
      const data = await listVehicles();
      setVehicles(data);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to create vehicle";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <div className="card">
          <p>Loading vehicles...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="card">
          <div className="error">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="card">
        <h1>Your Vehicles</h1>
        <form onSubmit={onSubmit} style={{ marginBottom: "16px" }}>
          <div className="field">
            <label htmlFor="regNumber">Registration number</label>
            <input
              id="regNumber"
              value={form.regNumber}
              onChange={(e) => setForm((f) => ({ ...f, regNumber: e.target.value }))}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="name">Name (optional)</label>
            <input id="name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="field">
            <label htmlFor="type">Type (optional)</label>
            <input id="type" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} />
          </div>
          <div className="field" style={{ flexDirection: "row", alignItems: "center", gap: "8px" }}>
            <input
              id="active"
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
              style={{ width: "16px", height: "16px" }}
            />
            <label htmlFor="active">Active</label>
          </div>
          <button className="button" type="submit" disabled={saving}>
            {saving ? "Saving..." : "Add vehicle"}
          </button>
          {success && <p className="muted" style={{ marginTop: "8px" }}>{success}</p>}
        </form>

        {error && <div className="error">{error}</div>}

        {vehicles.length === 0 ? (
          <p className="muted">No vehicles yet. Add your first vehicle.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {vehicles.map((v) => (
              <div
                key={v.id}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: "10px",
                  padding: "12px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <div>
                  <div style={{ fontWeight: 700 }}>
                    <span>{v.regNumber}</span>
                  </div>
                  <div className="muted">
                    {v.name || "Unnamed"} · {v.type || "Vehicle"}
                  </div>
                </div>
                <button
                  className="button"
                  style={{ width: "auto" }}
                  onClick={() => {
                    const target = `/admin/vehicles/${v.id}`;
                    navigate(tenantPath(slug, target));
                  }}
                >
                  Select
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VehiclesPage;
