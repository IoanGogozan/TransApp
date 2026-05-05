import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError, http } from "../api/http";
import { useAuth } from "../auth/AuthContext";
import { getCompanySlug } from "../auth/companySlug";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import FormField from "../components/ui/FormField";
import Input from "../components/ui/Input";
import SectionHeader from "../components/ui/SectionHeader";
import { PASSWORD_MIN_LENGTH, PASSWORD_TOO_SHORT_MESSAGE } from "../utils/passwordPolicy";

const ChangePasswordPage = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < PASSWORD_MIN_LENGTH) {
      setError(PASSWORD_TOO_SHORT_MESSAGE);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await http("/api/v1/me/password", { method: "PATCH", body: { password } });
      logout();
      const slug = getCompanySlug();
      navigate(slug ? `/c/${slug}/login` : "/login", { replace: true });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Unable to change password";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-start justify-center p-5">
      <Card className="w-full max-w-md">
        <SectionHeader title="Change password" />
        <p className="text-sm text-slate-600">Your account requires a new password before continuing.</p>
        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <form onSubmit={onSubmit}>
          <FormField label="New password" htmlFor="newPassword">
            <Input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={PASSWORD_MIN_LENGTH}
            />
          </FormField>
          <FormField label="Confirm new password" htmlFor="confirmPassword">
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={PASSWORD_MIN_LENGTH}
            />
          </FormField>
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save"}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default ChangePasswordPage;
