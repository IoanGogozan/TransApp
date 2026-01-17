import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { createDefect, listDefects } from "../../api/defects";
import { getMyVehicles, VehicleOption } from "../../api/timesheets";
import { ApiError } from "../../api/http";
import { Defect } from "../../types/defect";
import { getDefectDriverListTitle } from "../../utils/defects";
import { formatDateTime } from "../../utils/time";
import { tenantPath } from "../../utils/tenantPath";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import FormField from "../../components/ui/FormField";
import Input from "../../components/ui/Input";
import ListState from "../../components/ui/ListState";
import SectionHeader from "../../components/ui/SectionHeader";
import ModalShell from "../../components/ui/ModalShell";

const DriverDefectsPage = () => {
  const { companySlug } = useParams();
  const slug = companySlug;
  const navigate = useNavigate();
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
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [vehiclesError, setVehiclesError] = useState<string | null>(null);
  const [reportVehicleId, setReportVehicleId] = useState<string>("");
  const [reportTitle, setReportTitle] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [reportSubmitAttempted, setReportSubmitAttempted] = useState(false);
  const [reportSubmitError, setReportSubmitError] = useState<string | null>(null);
  const [reportSubmitting, setReportSubmitting] = useState(false);

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
    if (!reportModalOpen) return;
    setReportSubmitAttempted(false);
    setVehiclesError(null);
    setVehiclesLoading(true);
    getMyVehicles()
      .then((res) => {
        setVehicles(res.vehicles || []);
        if (vehicleId) {
          setReportVehicleId(String(vehicleId));
        } else if (res.vehicles && res.vehicles.length > 0) {
          setReportVehicleId(String(res.vehicles[0].id));
        }
      })
      .catch((err) => {
        const msg = err instanceof ApiError ? err.message : "Failed to load vehicles";
        setVehiclesError(msg);
      })
      .finally(() => {
        setVehiclesLoading(false);
      });
  }, [reportModalOpen, vehicleId]);

  const isTitleValid = reportTitle.trim().length >= 3 && reportTitle.trim().length <= 120;
  const isVehicleSelected = reportVehicleId !== "";
  const canCreateDefect = isTitleValid && isVehicleSelected;

  const handleCreateDefect = async () => {
    setReportSubmitAttempted(true);
    setReportSubmitError(null);
    if (!canCreateDefect) return;
    setReportSubmitting(true);
    try {
      const created = await createDefect({
        vehicleId: Number(reportVehicleId),
        source: "MANUAL",
        title: reportTitle.trim(),
        description: reportDescription.trim() ? reportDescription.trim() : null,
      });
      await load();
      setReportModalOpen(false);
      navigate(tenantPath(slug, `/driver/defects/${created.id}`));
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to create defect";
      setReportSubmitError(msg);
    } finally {
      setReportSubmitting(false);
    }
  };

  useEffect(() => {
    if (focusId && highlightedRef.current) {
      highlightedRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [focusId, items.length]);

  return (
    <div className="min-h-screen flex items-start justify-center p-5">
      <Card>
        <SectionHeader
          title="Defects"
          right={(
            <Button variant="primary" size="sm" onClick={() => setReportModalOpen(true)}>
              Report defect
            </Button>
          )}
        />
        {vehicleId ? <p className="muted">Filtered by vehicle {vehicleId}</p> : null}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginBottom: "12px" }}>
          <FormField label="Status">
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
          </FormField>
          <FormField label="Show resolved">
            <input
              type="checkbox"
              checked={showResolved}
              onChange={(event) => setShowResolved(event.target.checked)}
            />
          </FormField>
        </div>
        <ListState
          loading={loading}
          hasItems={filteredItems.length > 0}
          emptyTitle="No defects"
          emptyMessage="No defects yet."
          errorMessage={error}
        >
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
                  {vehicleLabel} - {formatDateTime(d.createdAt)}
                </div>
              </Link>
            );
            })}
          </div>
        </ListState>
        {error ? (
          <div style={{ marginTop: "12px" }}>
            <Button variant="primary" onClick={load}>
              Retry
            </Button>
          </div>
        ) : null}
      </Card>
      {reportModalOpen ? (
        <div
          role="presentation"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            zIndex: 50,
          }}
          onClick={() => setReportModalOpen(false)}
        >
          <Card
            className="max-w-[520px] w-full max-h-[80vh] overflow-y-auto"
            onClick={(event) => event.stopPropagation()}
          >
            <ModalShell
              title="Report defect"
              onClose={() => setReportModalOpen(false)}
              footer={(
                <>
                  <Button variant="secondary" size="sm" onClick={() => setReportModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={!canCreateDefect || reportSubmitting}
                    onClick={handleCreateDefect}
                  >
                    {reportSubmitting ? "Creating..." : "Create defect"}
                  </Button>
                </>
              )}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <FormField label="Vehicle" htmlFor="reportVehicle">
                  <select
                    id="reportVehicle"
                    value={reportVehicleId}
                    onChange={(event) => setReportVehicleId(event.target.value)}
                    disabled={vehiclesLoading}
                    style={{ padding: "11px 12px", borderRadius: "10px", border: "1px solid #d1d5db" }}
                  >
                    <option value="">{vehiclesLoading ? "Loading vehicles..." : "Select vehicle"}</option>
                    {vehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.regNumber}
                        {vehicle.name ? ` - ${vehicle.name}` : ""}
                      </option>
                    ))}
                  </select>
                  {vehiclesError ? <div className="error">{vehiclesError}</div> : null}
                  {reportSubmitAttempted && !isVehicleSelected ? (
                    <div className="error">Select a vehicle.</div>
                  ) : null}
                </FormField>
                <FormField
                  label="Title"
                  htmlFor="reportTitle"
                  hint={`${reportTitle.length}/120`}
                >
                  <Input
                    id="reportTitle"
                    value={reportTitle}
                    onChange={(event) => setReportTitle(event.target.value)}
                    placeholder="Tyres worn right side"
                    maxLength={120}
                  />
                  {reportSubmitAttempted && !isTitleValid ? (
                    <div className="error">Title must be between 3 and 120 characters.</div>
                  ) : null}
                </FormField>
                <FormField label="Description (optional)" htmlFor="reportDescription">
                  <textarea
                    id="reportDescription"
                    value={reportDescription}
                    onChange={(event) => setReportDescription(event.target.value)}
                    rows={4}
                    maxLength={2000}
                    style={{ padding: "11px 12px", borderRadius: "10px", border: "1px solid #d1d5db" }}
                  />
                </FormField>
                {reportSubmitError ? <div className="error">{reportSubmitError}</div> : null}
              </div>
            </ModalShell>
          </Card>
        </div>
      ) : null}
    </div>
  );
};

export default DriverDefectsPage;

