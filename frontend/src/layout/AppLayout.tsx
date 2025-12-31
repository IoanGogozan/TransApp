import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const dashboardPathForRole = (role?: string | null) => {
  if (role === "ADMIN" || role === "PLATFORM_ADMIN") return "/app";
  if (role === "DRIVER") return "/app";
  return "/app";
};

const AppLayout = () => {
  const { user, role, company, logout } = useAuth();
  const location = useLocation();
  const isDriver = role === "DRIVER";
  const isAdmin = role === "ADMIN" || role === "PLATFORM_ADMIN";
  const identifier = user ? user.email || user.phone || user.username || `User ${user.id}` : "Not signed in";
  const slugPrefix = company?.slug ? `/c/${company.slug}` : "";
  const pathWithSlug = (path: string) => (slugPrefix ? `${slugPrefix}${path}` : path);
  const missingSlug =
    !location.pathname.startsWith("/c/") &&
    (location.pathname.startsWith("/admin") || location.pathname.startsWith("/driver"));

  return (
    <div>
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          background: "#111827",
          color: "#fff",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
          <Link to="/" style={{ color: "#fff", fontWeight: 700 }}>
            TransApp
          </Link>
          <Link to={pathWithSlug(dashboardPathForRole(role))} style={{ color: "#e5e7eb" }}>
            Dashboard
          </Link>
          {isDriver ? (
            <>
              <Link to={pathWithSlug("/driver/timesheet")} style={{ color: "#e5e7eb" }}>
                Timesheet
              </Link>
              <Link to={pathWithSlug("/driver/checklist")} style={{ color: "#e5e7eb" }}>
                Checklist
              </Link>
            </>
          ) : null}
          {isAdmin ? (
            <>
              <Link to={pathWithSlug("/admin/users")} style={{ color: "#e5e7eb" }}>
                Users
              </Link>
              <Link to={pathWithSlug("/admin/vehicles")} style={{ color: "#e5e7eb" }}>
                Vehicles
              </Link>
              <Link to={pathWithSlug("/admin/routes")} style={{ color: "#e5e7eb" }}>
                Routes
              </Link>
              <Link to={pathWithSlug("/admin/customers")} style={{ color: "#e5e7eb" }}>
                Customers
              </Link>
              <Link to={pathWithSlug("/admin/defects")} style={{ color: "#e5e7eb" }}>
                Defects
              </Link>
              <Link to={pathWithSlug("/admin/timesheets")} style={{ color: "#e5e7eb" }}>
                Timesheets
              </Link>
              <Link to={pathWithSlug("/admin/reports")} style={{ color: "#e5e7eb" }}>
                Reports / Export
              </Link>
              <Link to={pathWithSlug("/app/help")} style={{ color: "#e5e7eb" }}>
                Help
              </Link>
            </>
          ) : null}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          {company ? (
            <span style={{ color: "#a5b4fc", fontWeight: 600 }}>
              {company.name} ({company.slug})
            </span>
          ) : null}
          <span style={{ color: "#e5e7eb" }}>{user ? `${identifier} (${user.role})` : "Not signed in"}</span>
          <button
            className="button"
            style={{ width: "auto", background: "#f43f5e", color: "#fff" }}
            onClick={logout}
          >
            Logout
          </button>
        </div>
      </nav>
      {missingSlug && company?.slug ? (
        <div
          style={{
            background: "#fef3c7",
            color: "#92400e",
            padding: "10px 16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div>Tenant slug missing in URL. You may be redirected to tenant-aware route.</div>
          <Link className="button" to={`${slugPrefix}${location.pathname}`} style={{ width: "auto" }}>
            Go to {company.slug}
          </Link>
        </div>
      ) : null}
      <Outlet />
    </div>
  );
};

export default AppLayout;
