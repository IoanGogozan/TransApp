import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { listDefects } from "../../api/defects";
import { ApiError } from "../../api/http";
import { Defect } from "../../types/defect";
import { getDefectDriverListTitle } from "../../utils/defects";
import { formatDateTime } from "../../utils/time";
import { tenantPath } from "../../utils/tenantPath";

const DriverDefectsPage = () => {
  const { companySlug } = useParams();
  const slug = companySlug;
  const [searchParams] = useSearchParams();
  const vehicleIdParam = searchParams.get("vehicleId");
  const vehicleId = useMemo(() => {
    if (!vehicleIdParam) return undefined;
    const parsed = Number(vehicleIdParam);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  }, [vehicleIdParam]);
  const focusId = searchParams.get("focus");
  const highlightedRef = useRef<HTMLAnchorElement | null>(null);
  const [items, setItems] = useState<Defect[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"ALL" | Defect["status"]>("ALL");
  const [showResolved, setShowResolved] = useState(false);

  const filteredItems = useMemo(() => {
    return items.filter((defect) => {
      if (statusFilter !== "ALL") {
        return defect.status === statusFilter;
      }
      if (!showResolved && defect.status === "RESOLVED") {
        return false;
      }
      return true;
    });
  }, [items, statusFilter, showResolved]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listDefects(vehicleId ? { vehicleId } : undefined);
      setItems(res.items || []);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to load defects";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicleIdParam]);

  useEffect(() => {
    if (focusId && highlightedRef.current) {
      highlightedRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [focusId, items.length]);

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
          <button className="button" onClick={load}>
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
        {vehicleId ? <p className="muted">Filtered by vehicle {vehicleId}</p> : null}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginBottom: "12px" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <span className="muted" style={{ fontSize: "12px" }}>
              Status
            </span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as "ALL" | Defect["status"])}
              style={{ padding: "8px", borderRadius: "8px", border: "1px solid #d1d5db" }}
            >
              <option value="ALL">All</option>
              <option value="OPEN">OPEN</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="RESOLVED">RESOLVED</option>
            </select>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "20px" }}>
            <input
              type="checkbox"
              checked={showResolved}
              onChange={(event) => setShowResolved(event.target.checked)}
            />
            <span className="muted">Show resolved</span>
          </label>
        </div>
        {filteredItems.length === 0 ? (
          <p className="muted">No defects.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {filteredItems.map((d) => {
              const title = getDefectDriverListTitle(d) || "(No title)";
              const vehicleLabel = d.vehicle?.regNumber
                ? `Vehicle: ${d.vehicle.regNumber}${d.vehicle?.name ? ` - ${d.vehicle.name}` : ""}`
                : d.vehicleId
                  ? `Vehicle ID: ${d.vehicleId}`
                  : "Vehicle";
              const statusStyles =
                d.status === "RESOLVED"
                  ? { background: "#dcfce7", color: "#166534" }
                  : d.status === "IN_PROGRESS"
                  ? { background: "#dbeafe", color: "#1d4ed8" }
                  : { background: "#fef3c7", color: "#92400e" };
              return (
              <Link
                key={d.id}
                ref={focusId && String(d.id) === focusId ? highlightedRef : null}
                to={tenantPath(slug, `/driver/defects/${d.id}`)}
                style={{
                  border: "1px solid #cbd5e1",
                  borderRadius: "10px",
                  padding: "12px",
                  textDecoration: "none",
                  color: "inherit",
                  background: focusId && String(d.id) === focusId ? "#fef9c3" : "#f1f5f9",
                  boxShadow:
                    focusId && String(d.id) === focusId ? "0 0 0 2px rgba(250, 204, 21, 0.6)" : "none",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
                  <div style={{ fontWeight: 700 }}>{title}</div>
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: "999px",
                      ...statusStyles,
                    }}
                  >
                    {d.status}
                  </span>
                </div>
                <div className="muted" style={{ fontSize: "12px", marginTop: "4px" }}>
                  {vehicleLabel} • {formatDateTime(d.createdAt)}
                  {d.source === "MANUAL" ? " • Manual" : ""}
                </div>
              </Link>
            );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DriverDefectsPage;
