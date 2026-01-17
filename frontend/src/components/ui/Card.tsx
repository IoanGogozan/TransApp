import { HTMLAttributes, ReactNode } from "react";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

const Card = ({ children, className = "", ...props }: CardProps) => {
  const classes = ["rounded-xl border border-slate-200 bg-white shadow-sm p-4", className]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
};

export default Card;
