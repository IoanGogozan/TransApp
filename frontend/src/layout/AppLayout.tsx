import { Link, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const AppLayout = () => {
  const { user, role, logout } = useAuth();

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
            Home
          </Link>
          <Link to="/driver/vehicles" style={{ color: "#e5e7eb" }}>
            Vehicles
          </Link>
          <Link to="/driver/checklist" style={{ color: "#e5e7eb" }}>
            Checklist
          </Link>
          <Link to="/driver/shift" style={{ color: "#e5e7eb" }}>
            Shift
          </Link>
          <Link to="/driver/timesheet" style={{ color: "#e5e7eb" }}>
            Timesheet
          </Link>
          {(role === "ADMIN" || role === "OWNER") && (
            <>
              <Link to="/admin/defects" style={{ color: "#e5e7eb" }}>
                Admin: Defects
              </Link>
              <Link to="/admin/users" style={{ color: "#e5e7eb" }}>
                Admin: Users
              </Link>
            </>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <span style={{ color: "#e5e7eb" }}>
            {user ? `${user.email} (${user.role})` : "Not signed in"}
          </span>
          <button
            className="button"
            style={{ width: "auto", background: "#f43f5e", color: "#fff" }}
            onClick={logout}
          >
            Logout
          </button>
        </div>
      </nav>
      <Outlet />
    </div>
  );
};

export default AppLayout;
