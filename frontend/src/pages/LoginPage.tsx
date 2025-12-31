import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ApiError } from "../api/http";
import { useAuth } from "../auth/AuthContext";
import { getPublicCompany } from "../api/auth";
import { setCompanySlug } from "../auth/companySlug";

const LoginPage = () => {
  const navigate = useNavigate();
  const { companySlug } = useParams();
  const [searchParams] = useSearchParams();
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [companyError, setCompanyError] = useState<string | null>(null);
  const [companyLoading, setCompanyLoading] = useState(true);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();

  useEffect(() => {
    if (!companySlug) {
      setCompanyError("Company not found");
      setCompanyLoading(false);
      return;
    }
    setCompanySlug(companySlug);
    const load = async () => {
      setCompanyLoading(true);
      setCompanyError(null);
      try {
        const res = await getPublicCompany(companySlug);
        setCompanyName(res.company.name);
      } catch (err) {
        const message = err instanceof ApiError ? err.message : "Unable to load company";
        setCompanyError(message);
      } finally {
        setCompanyLoading(false);
      }
    };
    load();
    const identifierPrefill = searchParams.get("identifier");
    if (identifierPrefill) {
      setPhone(identifierPrefill);
    }
  }, [companySlug, searchParams]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!companySlug || companyError) return;
    setError(null);
    setLoading(true);
    try {
      const me = await login(companySlug, phone.trim(), password);
      const slug = companySlug || me.company.slug;
      const role = me.user.role;
      if (slug) {
        if (role === "ADMIN" || role === "PLATFORM_ADMIN") {
          navigate(`/c/${slug}/app`, { replace: true });
        } else {
          navigate(`/c/${slug}/driver/timesheet`, { replace: true });
        }
      } else {
        navigate("/", { replace: true });
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Login failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const title = companyName ? `Sign in to ${companyName}` : "Sign in";

  return (
    <div className="page">
      <div className="card">
        <h1>{title}</h1>
        <p className="muted">
          {companyLoading ? "Loading company..." : companyError ? companyError : "Enter your phone and password to continue."}
        </p>
        {error && <div className="error">{error}</div>}
        <form onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="phone">Phone (email/username also accepted)</label>
            <input
              id="phone"
              type="tel"
              autoComplete="username"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              disabled={companyLoading || Boolean(companyError)}
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={companyLoading || Boolean(companyError)}
            />
          </div>
          <button className="button" type="submit" disabled={loading || companyLoading || Boolean(companyError)}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
