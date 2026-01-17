import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { resetPasswordWithToken, validatePasswordResetToken } from "../api/auth";
import PublicHeader from "../components/PublicHeader";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import FormField from "../components/ui/FormField";
import Input from "../components/ui/Input";
import SectionHeader from "../components/ui/SectionHeader";

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);
  const companySlug = useMemo(() => searchParams.get("companySlug") || "", [searchParams]);
  const [validating, setValidating] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token || !companySlug) {
      setValidating(false);
      setValidationError("Invalid reset link.");
      return;
    }

    let active = true;
    setValidating(true);
    setValidationError(null);

    validatePasswordResetToken(companySlug, token)
      .then(() => {
        if (active) {
          setValidating(false);
          setValidationError(null);
        }
      })
      .catch(() => {
        if (active) {
          setValidating(false);
          setValidationError("This reset link is invalid or expired. Please request a new one.");
        }
      });

    return () => {
      active = false;
    };
  }, [companySlug, token]);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await resetPasswordWithToken(companySlug, token, password);
      setSuccess("Password updated. You can now sign in.");
      navigate(`/c/${companySlug}/login`, { replace: true });
    } catch (err) {
      setError("Request failed. Try again later.");
    } finally {
      setLoading(false);
    }
  };

  const forgotLink = companySlug ? `/forgot-password?companySlug=${encodeURIComponent(companySlug)}` : "/forgot-password";

  return (
    <div className="min-h-screen flex items-start justify-center p-5">
      <Card className="w-full max-w-md">
        <PublicHeader />
        <SectionHeader title="Reset password" />

        {validationError === "Invalid reset link." ? (
          <>
            <div className="error">{validationError}</div>
            <Link to="/forgot-password">Request a new link</Link>
          </>
        ) : validating ? (
          <p className="muted">Validating reset link...</p>
        ) : validationError ? (
          <>
            <div className="error">{validationError}</div>
            <Link to={forgotLink}>Request a new link</Link>
          </>
        ) : (
          <>
            <p className="muted">Choose a new password for your account.</p>
            {error && <div className="error">{error}</div>}
            {success && <div className="success">{success}</div>}
            <form onSubmit={onSubmit}>
              <FormField label="New password" htmlFor="password">
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </FormField>
              <FormField label="Confirm password" htmlFor="confirmPassword">
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </FormField>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Reset password"}
              </Button>
            </form>
          </>
        )}
      </Card>
    </div>
  );
};

export default ResetPasswordPage;
