import { Link, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { tenantPath } from "../utils/tenantPath";

const HomePage = () => {
  const { user, company, loading, error, logout } = useAuth();
  const { companySlug } = useParams();
  const slug = companySlug || company?.slug;

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
        <h1>Admin hub</h1>
        <p className="muted">Manage users, vehicles, routes, customers and timesheets.</p>
        {(user.role === "ADMIN" || user.role === "PLATFORM_ADMIN") && (
          <>
            <div style={{ marginTop: "16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px" }}>
                <Link className="button" to={tenantPath(slug, "/admin/users")} style={{ width: "auto" }}>
                  Users
                </Link>
                <Link className="button" to={tenantPath(slug, "/admin/vehicles")} style={{ width: "auto" }}>
                  Vehicles
                </Link>
                <Link className="button" to={tenantPath(slug, "/admin/routes")} style={{ width: "auto" }}>
                  Routes
                </Link>
                <Link className="button" to={tenantPath(slug, "/admin/customers")} style={{ width: "auto" }}>
                  Customers
                </Link>
                <Link className="button" to={tenantPath(slug, "/admin/defects")} style={{ width: "auto" }}>
                  Defects
                </Link>
                <Link className="button" to={tenantPath(slug, "/admin/timesheets")} style={{ width: "auto" }}>
                  Timesheets
                </Link>
                <Link className="button" to={tenantPath(slug, "/admin/reports")} style={{ width: "auto" }}>
                  Reports / Export
                </Link>
                <Link className="button" to={tenantPath(slug, "/app/help")} style={{ width: "auto" }}>
                  Help
                </Link>
              </div>
            </div>

            <div style={{ marginTop: "16px" }}>
              <h2 style={{ marginBottom: "8px" }}>Personal</h2>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                <Link className="button" to={tenantPath(slug, "/driver/timesheet")} style={{ width: "auto" }}>
                  My Timesheet
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default HomePage;
