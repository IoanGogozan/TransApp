import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { listDefects } from "../api/defects";
import { Defect, DefectStatus } from "../types/defect";
import { listVehicles } from "../api/vehicles";
import { listCompanyUsers } from "../api/users";
import { Vehicle } from "../types/vehicle";
import { User } from "../types/user";
import { ApiError } from "../api/http";
import { formatDateTime } from "../utils/time";
import { tenantPath } from "../utils/tenantPath";

const statusOptions: Array<DefectStatus | "ALL"> = ["ALL", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];

const DefectsListPage = () => {
  const navigate = useNavigate();
  const { companySlug } = useParams();
  const slug = companySlug;
  const [items, setItems] = useState<Defect[]>([]);
  const [status, setStatus] = useState<DefectStatus | "ALL">("ALL");
  const [usersById, setUsersById] = useState<Record<number, User>>({});
  const [vehiclesById, setVehiclesById] = useState<Record<number, Vehicle>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLookups = async () => {
    try {
      const [usersRes, vehiclesRes] = await Promise.all([listCompanyUsers(), listVehicles()]);
      const usersMap = usersRes.reduce<Record<number, User>>((acc, user) => {
        const key = Number(user.id);
        if (!Number.isNaN(key)) acc[key] = user;
        return acc;
      }, {});
      const vehiclesMap = vehiclesRes.reduce<Record<number, Vehicle>>((acc, vehicle) => {
        const key = Number(vehicle.id);
        if (!Number.isNaN(key)) acc[key] = vehicle;
        return acc;
      }, {});
      setUsersById(usersMap);
      setVehiclesById(vehiclesMap);
    } catch (err) {
      // Keep fallbacks; do not block defects listing
      console.warn("[defects] Failed to load lookups", err);
    }
  };

  const loadDefects = async (selectedStatus: DefectStatus | "ALL") => {
    setLoading(true);
    setError(null);
    try {
      const statusFilter = selectedStatus !== "ALL" ? { status: selectedStatus } : undefined;
      const res = await listDefects(statusFilter);
      setItems(res.items || []);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to load defects";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLookups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadDefects(status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const handleStatusChange = (value: DefectStatus | "ALL") => {
    setStatus(value);
  };

  if (loading) {
    return (
      <div className="page">
        <div className="card">
          <p>Loading defects...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="card">
          <div className="error">{error}</div>
          <button
            className="button"
            onClick={() => {
              loadLookups();
              loadDefects(status);
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="card">
        <h1>Defects</h1>
        <div className="field" style={{ maxWidth: "220px" }}>
          <label htmlFor="status">Status</label>
          <select
            id="status"
            value={status}
            onChange={(e) => handleStatusChange(e.target.value as DefectStatus | "ALL")}
            style={{ padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db" }}
          >
            {statusOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt === "ALL" ? "All" : opt}
              </option>
            ))}
          </select>
        </div>

        {items.length === 0 ? (
          <p className="muted">No defects.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {items.map((d) => (
              <div
                key={d.id}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: "10px",
                  padding: "10px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, display: "flex", gap: "8px", alignItems: "center" }}>
                    <span>{d.title || "(No title)"}</span>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "#2563eb" }}>{d.status}</span>
                  </div>
                  <div className="muted">
                    Vehicle: {vehiclesById[Number(d.vehicleId)]?.regNumber || d.vehicleId || "—"} · Reported by:{" "}
                    {usersById[Number(d.reportedByUserId)]?.email || d.reportedByUserId || "—"} · Assigned to:{" "}
                    {d.assignedToUserId == null
                      ? "Unassigned"
                      : usersById[Number(d.assignedToUserId)]?.email || d.assignedToUserId}{" "}
                    · {formatDateTime(d.createdAt)}
                  </div>
                </div>
                <button
                  className="button"
                  style={{ width: "auto" }}
                  onClick={() => navigate(tenantPath(slug, `/admin/defects/${d.id}`))}
                >
                  Details
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DefectsListPage;
