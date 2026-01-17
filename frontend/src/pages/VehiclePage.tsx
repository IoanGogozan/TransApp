import { useParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { getVehicleById, updateVehicle } from "../api/vehicles";
import { Vehicle } from "../types/vehicle";
import { ApiError } from "../api/http";
import { tenantPath } from "../utils/tenantPath";
import Button from "../components/ui/Button";
import ButtonLink from "../components/ui/ButtonLink";
import Card from "../components/ui/Card";
import FormField from "../components/ui/FormField";
import Input from "../components/ui/Input";
import ListState from "../components/ui/ListState";
import SectionHeader from "../components/ui/SectionHeader";

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

  return (
    <div className="min-h-screen flex items-start justify-center p-5">
      <ListState
        loading={loading}
        hasItems={!!vehicle}
        errorMessage={loadError}
        emptyTitle="Vehicle not found"
      >
        <Card>
          <SectionHeader title="Vehicle" />
          <p className="muted">{vehicle?.type || "Vehicle"}</p>
          {message && <p className="success">{message}</p>}
          {saveError && <p className="error">{saveError}</p>}
          <div style={{ display: "grid", gap: "12px", marginTop: "12px" }}>
            <FormField label="Reg number">
              <Input
                value={regNumber}
                onChange={(e) => setRegNumber(e.target.value)}
                required
              />
            </FormField>
            <FormField label="Name">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </FormField>
            <FormField label="Active">
              <select value={active ? "active" : "inactive"} onChange={(e) => setActive(e.target.value === "active")}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </FormField>
          </div>
          <div className="row" style={{ marginTop: "12px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
            <ButtonLink variant="secondary" to={tenantPath(slug, vehiclesPath)}>
              Back to vehicles
            </ButtonLink>
          </div>
        </Card>
      </ListState>
    </div>
  );
};

export default VehiclePage;

