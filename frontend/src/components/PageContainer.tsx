import { ReactNode } from "react";

type PageContainerProps = {
  children: ReactNode;
  className?: string;
};

const PageContainer = ({ children, className = "" }: PageContainerProps) => {
  const classes = `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 ${className}`.trim();
  return <div className={classes}>{children}</div>;
};

export default PageContainer;
