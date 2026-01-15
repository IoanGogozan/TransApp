import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { requestPasswordReset } from "../api/auth";
import PublicHeader from "../components/PublicHeader";

const ForgotPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const [companySlug, setCompanySlug] = useState(searchParams.get("companySlug") || "");
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmedSlug = companySlug.trim();
    const trimmedEmail = email.trim();

    if (!trimmedSlug || !trimmedEmail) {
      setError("Company slug and email are required.");
      return;
    }

    setLoading(true);
    try {
      const res = await requestPasswordReset(trimmedSlug, trimmedEmail);
      setSuccess(res?.message || "If the account exists, we sent a link.");
    } catch (err) {
      setError("Request failed. Try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="card" style={{ maxWidth: 520, width: "100%" }}>
        <PublicHeader />
        <h1>Forgot password</h1>
        <p className="muted">Enter your company slug and admin email. We will email you a reset link.</p>
        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}
        <form onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="companySlug">Company slug</label>
            <input
              id="companySlug"
              type="text"
              placeholder="your-company"
              value={companySlug}
              onChange={(e) => setCompanySlug(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="admin@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <button className="button" type="submit" disabled={loading}>
            {loading ? "Sending..." : "Send reset link"}
          </button>
        </form>
        <div style={{ marginTop: "12px" }}>
          <Link to="/login">Sign in</Link> · <Link to="/help">Help</Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
