import { ReactNode } from "react";

type TableWrapProps = {
  children: ReactNode;
  className?: string;
};

const TableWrap = ({ children, className = "" }: TableWrapProps) => {
  const classes = `w-full overflow-x-auto rounded-lg border border-slate-200 ${className}`.trim();
  return (
    <div className={classes}>
      <div className="min-w-full">{children}</div>
    </div>
  );
};

export default TableWrap;
