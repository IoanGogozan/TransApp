import { FormEvent, useId, useState, type CSSProperties } from "react";
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
  const errorId = useId();
  const [slug, setSlug] = useState(getCompanySlug() || "");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recentSlugs, setRecentSlugs] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("transapp.recentCompanySlugs");
      if (!stored) {
        return [];
      }
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
    } catch {
      return [];
    }
  });

  const validateSlug = (value: string) => {
    if (value.length < 2 || value.length > 50) {
      return "Slug must be between 2 and 50 characters";
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
      return "Slug must use lowercase letters, numbers, and single hyphens";
    }
    return null;
  };

  const saveRecentSlug = (value: string) => {
    const next = [value, ...recentSlugs.filter((item) => item !== value)].slice(0, 5);
    setRecentSlugs(next);
    localStorage.setItem("transapp.recentCompanySlugs", JSON.stringify(next));
  };

  const submitSlug = (value: string) => {
    const trimmedSlug = value.trim().toLowerCase();
    if (!trimmedSlug) {
      setError("Enter your company slug to continue");
      document.getElementById("companySlug")?.focus();
      return false;
    }
    const validationError = validateSlug(trimmedSlug);
    if (validationError) {
      setError(validationError);
      document.getElementById("companySlug")?.focus();
      return false;
    }
    setIsSubmitting(true);
    saveRecentSlug(trimmedSlug);
    setCompanySlug(trimmedSlug);
    const next = onResolveNextPath ? onResolveNextPath(trimmedSlug) : `/c/${trimmedSlug}/login`;
    navigate(next, { replace: true });
    return true;
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    submitSlug(slug);
  };

  const trimmedSlug = slug.trim();
  const describedBy = error ? errorId : undefined;
  const content = (
    <>
      {embedded ? null : <SectionHeader title={title} subtitle={subtitle} />}
      {embedded ? <p className="text-sm text-slate-600">{subtitle}</p> : null}
      <form onSubmit={onSubmit} className="mt-4 space-y-3">
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
            placeholder="acme-transport"
            autoComplete="off"
            aria-describedby={describedBy}
            disabled={isSubmitting}
          />
        </FormField>
        {error ? (
          <p id={errorId} className="text-xs text-red-600">
            {error}
          </p>
        ) : null}
        <Button
          type="submit"
          className="w-full rounded-xl font-semibold shadow-sm hover:shadow-md sm:w-auto"
          disabled={!trimmedSlug || isSubmitting}
        >
          {isSubmitting ? "Continuing..." : submitLabel}
        </Button>
      </form>
      {recentSlugs.length ? (
        <div className="mt-4">
          <p className="text-xs font-semibold text-slate-600">Recent workspaces</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {recentSlugs.map((recent) => (
              <button
                key={recent}
                type="button"
                className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                onClick={() => {
                  setError(null);
                  setSlug(recent);
                  submitSlug(recent);
                }}
              >
                {recent}
              </button>
            ))}
          </div>
        </div>
      ) : null}
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
