import { ReactNode } from "react";
import Button from "./Button";

type ModalShellProps = {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

const ModalShell = ({ title, onClose, children, footer, className = "" }: ModalShellProps) => {
  const classes = ["flex flex-col gap-4", className].filter(Boolean).join(" ");
  return (
    <div className={classes}>
      <div className="flex items-start justify-between gap-3">
        <div className="text-lg font-semibold">{title}</div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
      <div className="min-h-0">{children}</div>
      {footer ? <div className="flex items-center justify-end gap-2">{footer}</div> : null}
    </div>
  );
};

export default ModalShell;
