import { Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { getVehicleById } from "../api/vehicles";
import { Vehicle } from "../types/vehicle";
import { ApiError } from "../api/http";
import { tenantPath } from "../utils/tenantPath";

const VehiclePage = () => {
  const { vehicleId, companySlug } = useParams<{ vehicleId: string; companySlug?: string }>();
  const slug = companySlug;
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const vehiclesPath = "/admin/vehicles";

  useEffect(() => {
    const load = async () => {
      if (!vehicleId) return;
      setLoading(true);
      setError(null);
      try {
        const v = await getVehicleById(vehicleId);
        setVehicle(v);
      } catch (err) {
        const message = err instanceof ApiError ? err.message : "Vehicle not found";
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [vehicleId]);

  if (loading) {
    return (
      <div className="page">
        <div className="card">
          <p>Loading vehicle...</p>
        </div>
      </div>
    );
  }

  if (error || !vehicle) {
    return (
      <div className="page">
        <div className="card">
          <div className="error">{error || "Vehicle not found"}</div>
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
        <h1>{vehicle.regNumber}</h1>
        <p className="muted">
          {vehicle.name || "Unnamed"} · {vehicle.type || "Vehicle"}
        </p>
        <p className="muted">Status: {vehicle.active === false ? "Inactive" : "Active"}</p>
        <div className="row" style={{ marginTop: "12px" }}>
          <Link className="button" to={tenantPath(slug, vehiclesPath)} style={{ width: "auto" }}>
            Back to vehicles
          </Link>
        </div>
      </div>
    </div>
  );
};

export default VehiclePage;
