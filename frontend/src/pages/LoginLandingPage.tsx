import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCompanySlug, setCompanySlug } from "../auth/companySlug";

const LoginLandingPage = () => {
  const navigate = useNavigate();
  const [slug, setSlug] = useState(getCompanySlug() || "");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = slug.trim();
    if (!trimmed) {
      setError("Enter your company slug to continue");
      return;
    }
    setCompanySlug(trimmed);
    navigate(`/c/${trimmed}/login`, { replace: true });
  };

  return (
    <div className="page">
      <div className="card">
        <h1>Sign in</h1>
        <p className="muted">Enter your company slug to go to the login page.</p>
        {error && <div className="error">{error}</div>}
        <form onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="companySlug">Company slug</label>
            <input
              id="companySlug"
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="your-company"
              autoComplete="off"
            />
          </div>
          <button className="button" type="submit">
            Continue
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginLandingPage;
