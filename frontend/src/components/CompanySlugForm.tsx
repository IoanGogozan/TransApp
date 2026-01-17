import { FormEvent, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { getCompanySlug, setCompanySlug } from "../auth/companySlug";
import Button from "./ui/Button";
import Card from "./ui/Card";
import FormField from "./ui/FormField";
import Input from "./ui/Input";
import SectionHeader from "./ui/SectionHeader";

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
      {embedded ? null : <SectionHeader title={title} subtitle={subtitle} />}
      {embedded ? <p className="muted">{subtitle}</p> : null}
      {error && <div className="error">{error}</div>}
      <form onSubmit={onSubmit}>
        <FormField label="Company slug" htmlFor="companySlug">
          <Input
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
        </FormField>
        <Button type="submit">
          {submitLabel}
        </Button>
      </form>
    </>
  );

  if (embedded) {
    return content;
  }

  return (
    <Card style={containerStyle}>
      {content}
    </Card>
  );
};

export default CompanySlugForm;
