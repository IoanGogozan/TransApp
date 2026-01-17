import { ReactNode } from "react";

type FormFieldProps = {
  label?: string;
  htmlFor?: string;
  error?: string | null;
  hint?: string;
  children: ReactNode;
};

const FormField = ({ label, htmlFor, error, hint, children }: FormFieldProps) => {
  return (
    <div className="flex flex-col gap-1">
      {label ? (
        <label htmlFor={htmlFor} className="text-sm font-medium text-slate-900">
          {label}
        </label>
      ) : null}
      <div>{children}</div>
      {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
};

export default FormField;
