import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ApiError } from "../api/http";
import { useAuth } from "../auth/AuthContext";
import { getPublicCompany } from "../api/auth";
import { setCompanySlug } from "../auth/companySlug";
import PublicLayout from "../components/layout/PublicLayout";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import FormField from "../components/ui/FormField";
import Input from "../components/ui/Input";
import SectionHeader from "../components/ui/SectionHeader";
import ButtonLink from "../components/ui/ButtonLink";

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
    <PublicLayout contentClassName="mt-5 sm:mt-7">
      <div className="mx-auto w-full max-w-[560px] sm:max-w-[600px]">
        <Card className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-6 shadow-sm sm:p-8">
          <div className="space-y-4 sm:space-y-6 [&_form]:space-y-4 sm:[&_form]:space-y-5">
            <SectionHeader title={title} />
            <p className="text-sm text-slate-600">
              {companyLoading
                ? "Loading company..."
                : companyError
                  ? companyError
                  : "Enter your phone and password to continue."}
            </p>
            {!companyLoading ? (
              <div>
                <Link to="/login" className="text-sm text-blue-600 hover:underline">
                  Not your company? Enter a different slug
                </Link>
              </div>
            ) : null}
            {companyError ? (
              <ButtonLink variant="secondary" to="/login" className="w-auto">
                Back to company slug
              </ButtonLink>
            ) : null}
            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}
            <form onSubmit={onSubmit} className="flex flex-col">
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
              <Button
                variant="primary"
                type="submit"
                className="w-full shadow-sm hover:shadow-md sm:w-auto"
                disabled={loading || companyLoading || Boolean(companyError)}
              >
                {loading ? "Signing in..." : "Sign in"}
              </Button>
              <div className="mt-2">
                <Link
                  to={`/forgot-password?companySlug=${encodeURIComponent(forgotSlug)}`}
                  className="text-sm text-slate-600 hover:text-slate-900 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
            </form>
          </div>
        </Card>
      </div>
    </PublicLayout>
  );
};

export default LoginPage;


