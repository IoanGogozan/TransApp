import { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

const Input = ({ className = "", ...props }: InputProps) => {
  const classes = [
    "w-full rounded-md border border-slate-300 px-3 py-2 text-sm",
    "focus:outline-none focus:ring-2 focus:ring-slate-400",
    "disabled:bg-slate-100 disabled:text-slate-500",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <input className={classes} {...props} />;
};

export default Input;
