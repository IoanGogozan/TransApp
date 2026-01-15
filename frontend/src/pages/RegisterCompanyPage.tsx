import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "../api/http";
import { registerCompany } from "../api/auth";
import { useAuth } from "../auth/AuthContext";
import PublicHeader from "../components/PublicHeader";

const slugRegex = /^[a-z0-9-]{3,40}$/;

const RegisterCompanyPage = () => {
  const navigate = useNavigate();
  const { user, company } = useAuth();
  const [companyName, setCompanyName] = useState("");
  const [companySlug, setCompanySlug] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const slug = companySlug.trim().toLowerCase();
    if (!slugRegex.test(slug)) {
      setError("Slug must be 3-40 chars, lowercase letters, numbers, or hyphens.");
      return;
    }
    if (adminPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      await registerCompany({
        companyName: companyName.trim(),
        companySlug: slug,
        adminEmail: adminEmail.trim(),
        adminPassword,
      });
      setSuccess("Company created. Next: sign in to your workspace.");
      navigate(`/c/${slug}/login`, { replace: true });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Registration failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PublicHeader />
      <div className="page page-top">
        <div className="container">
          <div className="auth-wrap">
            <div className="card auth-card">
        <h1>Register company</h1>
        <p className="muted">Create your transport workspace and first admin.</p>
        {user && company ? (
          <div className="info" style={{ marginBottom: "12px" }}>
            You're logged in as <strong>{user.email || user.phone || user.username || `User ${user.id}`}</strong> in{" "}
            <strong>{company.name}</strong>.{" "}
            <button className="button secondary" style={{ width: "auto", marginTop: "8px" }} onClick={() => navigate("/app")}>
              Go to Dashboard
            </button>
          </div>
        ) : null}
        {success ? <div className="success">{success}</div> : null}
        {error ? <div className="error">{error}</div> : null}
        <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div className="field">
            <label htmlFor="companyName">Company name</label>
            <input
              id="companyName"
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="companySlug">Slug (lowercase letters, numbers, hyphen)</label>
            <input
              id="companySlug"
              type="text"
              value={companySlug}
              onChange={(e) => setCompanySlug(e.target.value)}
              required
              pattern={slugRegex.source}
            />
          </div>
          <div className="field">
            <label htmlFor="adminEmail">Admin email</label>
            <input
              id="adminEmail"
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="adminPassword">Admin password (min 8)</label>
            <input
              id="adminPassword"
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <button className="button" type="submit" disabled={loading}>
            {loading ? "Registering..." : "Create company"}
          </button>
          <p className="muted" style={{ fontSize: 14, marginTop: 12 }}>
            By registering, you agree to the <Link to="/terms">Terms of Service</Link> and acknowledge the{" "}
            <Link to="/privacy">Privacy</Link> policy.
          </p>
          <p className="muted" style={{ fontSize: "0.9rem" }}>
            <Link to="/login">Sign in</Link> · <Link to="/help">Help & Getting Started</Link>
          </p>
        </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default RegisterCompanyPage;


