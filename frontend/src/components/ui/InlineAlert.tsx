type InlineAlertProps = {
  variant: "info" | "warning" | "error";
  title?: string;
  message: string;
};

const variantClasses: Record<InlineAlertProps["variant"], string> = {
  info: "border-slate-200 bg-slate-50 text-slate-800",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  error: "border-red-200 bg-red-50 text-red-800",
};

const InlineAlert = ({ variant, title, message }: InlineAlertProps) => {
  const className = `rounded-lg border p-3 text-sm ${variantClasses[variant]}`;
  return (
    <div className={className}>
      {title ? <div className="font-semibold">{title}</div> : null}
      <div>{message}</div>
    </div>
  );
};

export default InlineAlert;
