import { FormEvent, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { getCompanySlug, setCompanySlug } from "../auth/companySlug";

type CompanySlugFormProps = {
  title?: string;
  subtitle?: string;
  submitLabel?: string;
  containerStyle?: CSSProperties;
  embedded?: boolean;
  onResolveNextPath?: (slug: string) => string;
};

const CompanySlugForm = ({
  title = "Sign in",
  subtitle = "Enter your company slug to continue.",
  submitLabel = "Continue",
  containerStyle,
  embedded = false,
  onResolveNextPath,
}: CompanySlugFormProps) => {
  const navigate = useNavigate();
  const [slug, setSlug] = useState(getCompanySlug() || "");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmedSlug = slug.trim().toLowerCase();
    if (!trimmedSlug) {
      setError("Enter your company slug to continue");
      return;
    }
    if (trimmedSlug.includes(" ")) {
      setError("Slug cannot contain spaces");
      return;
    }
    setCompanySlug(trimmedSlug);
    const next = onResolveNextPath ? onResolveNextPath(trimmedSlug) : `/c/${trimmedSlug}/login`;
    navigate(next, { replace: true });
  };

  const content = (
    <>
      <h1>{title}</h1>
      <p className="muted">{subtitle}</p>
      {error && <div className="error">{error}</div>}
      <form onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="companySlug">Company slug</label>
          <input
            id="companySlug"
            type="text"
            value={slug}
            onChange={(e) => {
              if (error) {
                setError(null);
              }
              setSlug(e.target.value);
            }}
            placeholder="your-company"
            autoComplete="off"
          />
        </div>
        <button className="button" type="submit">
          {submitLabel}
        </button>
      </form>
    </>
  );

  if (embedded) {
    return content;
  }

  return (
    <div className="card" style={containerStyle}>
      {content}
    </div>
  );
};

export default CompanySlugForm;
