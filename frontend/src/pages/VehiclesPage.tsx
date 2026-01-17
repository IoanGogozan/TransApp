import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createVehicle, listVehicles } from "../api/vehicles";
import { Vehicle } from "../types/vehicle";
import { ApiError } from "../api/http";
import { tenantPath } from "../utils/tenantPath";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import FormField from "../components/ui/FormField";
import Input from "../components/ui/Input";
import ListState from "../components/ui/ListState";
import SectionHeader from "../components/ui/SectionHeader";

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

  return (
    <div className="min-h-screen flex items-start justify-center p-5">
      <div className="w-full max-w-4xl flex flex-col gap-4">
        <SectionHeader title="Vehicles" subtitle="Manage your company vehicles." />
        <Card>
          <form onSubmit={onSubmit}>
          <FormField label="Registration number" htmlFor="regNumber">
            <Input
              id="regNumber"
              value={form.regNumber}
              onChange={(e) => setForm((f) => ({ ...f, regNumber: e.target.value }))}
              required
            />
          </FormField>
          <FormField label="Name (optional)" htmlFor="name">
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </FormField>
          <FormField label="Type (optional)" htmlFor="type">
            <Input
              id="type"
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            />
          </FormField>
          <FormField label="Active" htmlFor="active">
            <input
              id="active"
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
              style={{ width: "16px", height: "16px" }}
            />
          </FormField>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Add vehicle"}
          </Button>
          {success && <p className="muted" style={{ marginTop: "8px" }}>{success}</p>}
          </form>
        </Card>

        <Card>
          {error && vehicles.length > 0 ? <div className="error">{error}</div> : null}

          <ListState
            loading={loading}
            hasItems={vehicles.length > 0}
            emptyTitle="No vehicles"
            emptyMessage="No vehicles yet. Add your first vehicle."
            errorMessage={vehicles.length === 0 ? error : null}
          >
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
                      {v.name || "Unnamed"} - {v.type || "Vehicle"}
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      const target = `/admin/vehicles/${v.id}`;
                      navigate(tenantPath(slug, target));
                    }}
                  >
                    Edit
                  </Button>
                </div>
              ))}
            </div>
          </ListState>
        </Card>
      </div>
    </div>
  );
};

export default VehiclesPage;
