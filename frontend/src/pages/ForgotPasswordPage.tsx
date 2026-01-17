import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { requestPasswordReset } from "../api/auth";
import PublicHeader from "../components/PublicHeader";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import FormField from "../components/ui/FormField";
import Input from "../components/ui/Input";
import SectionHeader from "../components/ui/SectionHeader";

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
    <div className="min-h-screen flex items-start justify-center p-5">
      <Card className="w-full max-w-md">
        <PublicHeader />
        <SectionHeader title="Forgot password" />
        <p className="muted">Enter your company slug and admin email. We will email you a reset link.</p>
        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}
        <form onSubmit={onSubmit}>
          <FormField label="Company slug" htmlFor="companySlug">
            <Input
              id="companySlug"
              type="text"
              placeholder="your-company"
              value={companySlug}
              onChange={(e) => setCompanySlug(e.target.value)}
              required
            />
          </FormField>
          <FormField label="Email" htmlFor="email">
            <Input
              id="email"
              type="email"
              placeholder="admin@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </FormField>
          <Button type="submit" disabled={loading}>
            {loading ? "Sending..." : "Send reset link"}
          </Button>
        </form>
        <div style={{ marginTop: "12px" }}>
          <Link to="/login">Sign in</Link> Жњ <Link to="/help">Help</Link>
        </div>
      </Card>
    </div>
  );
};

export default ForgotPasswordPage;
