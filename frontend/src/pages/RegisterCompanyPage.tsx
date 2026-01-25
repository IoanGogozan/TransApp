import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "../api/http";
import { registerCompany } from "../api/auth";
import { useAuth } from "../auth/AuthContext";
import PublicLayout from "../components/layout/PublicLayout";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import FormField from "../components/ui/FormField";
import Input from "../components/ui/Input";
import SectionHeader from "../components/ui/SectionHeader";

const slugRegex = /^[a-z0-9-]{3,40}$/;

const RegisterCompanyPage = () => {
  const navigate = useNavigate();
  const { user, company } = useAuth();
  const [companyName, setCompanyName] = useState("");
  const [companySlug, setCompanySlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState({
    companyName: "",
    companySlug: "",
    adminEmail: "",
    adminPassword: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const nextErrors = {
      companyName: "",
      companySlug: "",
      adminEmail: "",
      adminPassword: "",
    };
    const trimmedName = companyName.trim();
    if (trimmedName.length < 2) {
      nextErrors.companyName = "Company name must be at least 2 characters.";
    }
    const slug = companySlug.trim().toLowerCase();
    if (!slug) {
      nextErrors.companySlug = "Company slug is required.";
    } else if (slug.length < 2 || slug.length > 50) {
      nextErrors.companySlug = "Slug must be between 2 and 50 characters.";
    } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      nextErrors.companySlug = "Slug must use lowercase letters, numbers, and single hyphens.";
    }
    const trimmedEmail = adminEmail.trim();
    if (!trimmedEmail) {
      nextErrors.adminEmail = "Admin email is required.";
    } else if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(trimmedEmail)) {
      nextErrors.adminEmail = "Enter a valid email address.";
    }
    if (adminPassword.length < 8) {
      nextErrors.adminPassword = "Password must be at least 8 characters.";
    }
    setFieldErrors(nextErrors);
    const firstInvalidField =
      nextErrors.companyName
        ? "companyName"
        : nextErrors.companySlug
          ? "companySlug"
          : nextErrors.adminEmail
            ? "adminEmail"
            : nextErrors.adminPassword
              ? "adminPassword"
              : null;
    if (firstInvalidField) {
      document.getElementById(firstInvalidField)?.focus();
      return;
    }

    setLoading(true);
    try {
      await registerCompany({
        companyName: trimmedName,
        companySlug: slug,
        adminEmail: trimmedEmail,
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

  const buildSlug = (value: string) =>
    value
      .toLowerCase()
      .trim()
      .replace(/[\s_]+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-{2,}/g, "-")
      .replace(/^-+|-+$/g, "");

  return (
    <PublicLayout contentClassName="mt-5 sm:mt-7">
      <div className="mx-auto w-full max-w-[600px] sm:max-w-[640px]">
        <Card className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-6 shadow-sm sm:p-8">
          <div className="space-y-5 sm:space-y-7 [&_form]:space-y-4 sm:[&_form]:space-y-5">
            <SectionHeader title="Register company" />
            <p className="text-sm text-slate-600">Create your transport workspace and first admin.</p>
            {user && company ? (
              <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                You're logged in as <strong>{user.email || user.phone || user.username || `User ${user.id}`}</strong> in{" "}
                <strong>{company.name}</strong>.{" "}
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-2 w-auto"
                  onClick={() => navigate("/app")}
                >
                  Go to Dashboard
                </Button>
              </div>
            ) : null}
            {success ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {success}
              </div>
            ) : null}
            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}
            <form onSubmit={onSubmit} className="flex flex-col">
              <FormField label="Company name" htmlFor="companyName">
                <Input
                  id="companyName"
                  type="text"
                  value={companyName}
                  onChange={(e) => {
                    if (fieldErrors.companyName) {
                      setFieldErrors((prev) => ({ ...prev, companyName: "" }));
                    }
                    const nextName = e.target.value;
                    setCompanyName(nextName);
                    if (!slugEdited) {
                      setCompanySlug(buildSlug(nextName));
                    }
                  }}
                  required
                  disabled={loading}
                />
                {fieldErrors.companyName ? (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.companyName}</p>
                ) : null}
              </FormField>
              <FormField label="Slug (lowercase letters, numbers, hyphen)" htmlFor="companySlug">
                <Input
                  id="companySlug"
                  type="text"
                  value={companySlug}
                  onChange={(e) => {
                    if (fieldErrors.companySlug) {
                      setFieldErrors((prev) => ({ ...prev, companySlug: "" }));
                    }
                    if (!slugEdited) {
                      setSlugEdited(true);
                    }
                    setCompanySlug(e.target.value);
                  }}
                  required
                  disabled={loading}
                  pattern={slugRegex.source}
                  placeholder="e.g. acme-transport"
                />
                {fieldErrors.companySlug ? (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.companySlug}</p>
                ) : null}
              </FormField>
              <FormField label="Admin email" htmlFor="adminEmail">
                <Input
                  id="adminEmail"
                  type="email"
                  value={adminEmail}
                  onChange={(e) => {
                    if (fieldErrors.adminEmail) {
                      setFieldErrors((prev) => ({ ...prev, adminEmail: "" }));
                    }
                    setAdminEmail(e.target.value);
                  }}
                  required
                  disabled={loading}
                />
                {fieldErrors.adminEmail ? (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.adminEmail}</p>
                ) : null}
              </FormField>
              <FormField label="Admin password (min 8)" htmlFor="adminPassword">
                <Input
                  id="adminPassword"
                  type="password"
                  value={adminPassword}
                  onChange={(e) => {
                    if (fieldErrors.adminPassword) {
                      setFieldErrors((prev) => ({ ...prev, adminPassword: "" }));
                    }
                    setAdminPassword(e.target.value);
                  }}
                  required
                  disabled={loading}
                  minLength={8}
                />
                {fieldErrors.adminPassword ? (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.adminPassword}</p>
                ) : null}
              </FormField>
              <Button
                variant="primary"
                type="submit"
                className="w-full shadow-sm hover:shadow-md sm:w-auto"
                disabled={loading}
              >
                {loading ? "Creating..." : "Create company"}
              </Button>
              <div className="mt-6 space-y-2 text-sm text-slate-600">
                <p>
                  By registering, you agree to the <Link to="/terms">Terms of Service</Link> and acknowledge the{" "}
                  <Link to="/privacy">Privacy</Link> policy.
                </p>
                <p>
                  Already have an account?{" "}
                  <Link className="hover:text-slate-900 hover:underline" to="/login">
                    Sign in
                  </Link>
                </p>
                <p>
                  <Link className="hover:text-slate-900 hover:underline" to="/help">
                    Help & Getting Started
                  </Link>
                </p>
                <p>
                  <Link className="hover:text-slate-900 hover:underline" to="/terms">
                    Terms
                  </Link>{" "}
                  and{" "}
                  <Link className="hover:text-slate-900 hover:underline" to="/privacy">
                    Privacy
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </Card>
      </div>
    </PublicLayout>
  );
};

export default RegisterCompanyPage;






