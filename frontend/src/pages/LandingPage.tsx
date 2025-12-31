import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const LandingPage = () => {
  const { user, company } = useAuth();
  const identifier = user ? user.email || user.phone || user.username || `User ${user.id}` : null;
  const dashboardPath = user ? "/app" : null;

  return (
    <div className="page">
      <div className="card" style={{ maxWidth: 520 }}>
        <h1>TransApp</h1>
        <p className="muted">Transport operations, driver checklists, and vehicle tracking in one place.</p>

        {user && company ? (
          <div className="info" style={{ margin: "12px 0" }}>
            You're logged in as <strong>{identifier}</strong> in <strong>{company.name}</strong>.{" "}
            <Link to={dashboardPath || "/app"} className="button secondary" style={{ width: "auto", marginLeft: "8px" }}>
              Go to Dashboard
            </Link>
          </div>
        ) : null}

        <div style={{ display: "flex", gap: "12px", marginTop: "16px", flexWrap: "wrap" }}>
          <Link className="button" to="/login" style={{ width: "auto" }}>
            Log in
          </Link>
          <Link className="button secondary" to="/register" style={{ width: "auto" }}>
            Register company
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
