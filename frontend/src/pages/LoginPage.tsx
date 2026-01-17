import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ApiError } from "../api/http";
import { useAuth } from "../auth/AuthContext";
import { getPublicCompany } from "../api/auth";
import { setCompanySlug } from "../auth/companySlug";
import PublicHeader from "../components/PublicHeader";
import Button from "../components/ui/Button";
import ButtonLink from "../components/ui/ButtonLink";
import Card from "../components/ui/Card";
import FormField from "../components/ui/FormField";
import Input from "../components/ui/Input";
import SectionHeader from "../components/ui/SectionHeader";

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
  const forgotSlug = companySlug || "";

  return (
    <div className="min-h-screen flex items-start justify-center p-5">
      <Card className="w-full max-w-md">
        <PublicHeader />
        <SectionHeader title={title} />
        <p className="muted">
          {companyLoading
            ? "Loading company..."
            : companyError
              ? companyError
              : "Enter your phone and password to continue."}
        </p>
        {!companyLoading ? (
          <div style={{ marginBottom: "8px" }}>
            <Link to="/login" style={{ fontSize: "14px", textDecoration: "none", color: "#2563eb" }}>
              Not your company? Enter a different slug
            </Link>
          </div>
        ) : null}
        {companyError ? (
          <ButtonLink variant="secondary" to="/login" className="w-auto mb-3">
            Back to company slug
          </ButtonLink>
        ) : null}
        {error && <div className="error">{error}</div>}
        <form onSubmit={onSubmit}>
          <FormField label="Phone (email/username also accepted)" htmlFor="phone">
            <Input
              id="phone"
              type="tel"
              autoComplete="username"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              disabled={companyLoading || Boolean(companyError)}
            />
          </FormField>
          <FormField label="Password" htmlFor="password">
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={companyLoading || Boolean(companyError)}
            />
          </FormField>
          <Button variant="primary" type="submit" disabled={loading || companyLoading || Boolean(companyError)}>
            {loading ? "Signing in..." : "Sign in"}
          </Button>
          <div style={{ marginTop: "8px" }}>
            <Link
              to={`/forgot-password?companySlug=${encodeURIComponent(forgotSlug)}`}
              className="muted"
              style={{ fontSize: 14, textDecoration: "none" }}
            >
              Forgot password?
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default LoginPage;


