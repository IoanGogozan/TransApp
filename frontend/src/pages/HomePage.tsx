import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { getActiveVehicleId } from "../driver/activeVehicle";

const HomePage = () => {
  const { user, company, loading, error, logout } = useAuth();

  if (loading) {
    return (
      <div className="page">
        <div className="card">
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !user || !company) {
    return (
      <div className="page">
        <div className="card">
          <div className="error">{error || "Unable to load profile."}</div>
          <button className="button" onClick={logout}>
            Go to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="card">
        <h1>Dashboard</h1>
        <p>
          Logged in as <strong>{user.email}</strong> ({user.role}) at <strong>{company.name}</strong>
        </p>
        <p className="muted">Active vehicle: {getActiveVehicleId() || "None"}</p>
        <div className="row">
          <span className="muted">User ID: {user.id}</span>
          <button className="button" onClick={logout}>
            Logout
          </button>
        </div>
        <div className="row" style={{ marginTop: "16px", flexWrap: "wrap" }}>
          <Link className="button" to="/driver/vehicles" style={{ width: "auto" }}>
            Driver: Vehicles
          </Link>
          <Link className="button" to="/driver/checklist" style={{ width: "auto" }}>
            Driver: Daily Checklist
          </Link>
          <Link className="button" to="/driver/shift" style={{ width: "auto" }}>
            Driver: Shift
          </Link>
          <Link className="button" to="/driver/timesheet" style={{ width: "auto" }}>
            Driver: Timesheet
          </Link>
          {(user.role === "ADMIN" || user.role === "OWNER") && (
            <Link className="button" to="/admin/defects" style={{ width: "auto" }}>
              Admin: Defects
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomePage;
