import { ReactNode } from "react";
import Card from "./Card";
import InlineAlert from "./InlineAlert";

type ListStateProps = {
  loading: boolean;
  hasItems: boolean;
  emptyTitle?: string;
  emptyMessage?: string;
  errorMessage?: string | null;
  children: ReactNode;
};

const ListState = ({
  loading,
  hasItems,
  emptyTitle = "No items",
  emptyMessage = "Nothing to show yet.",
  errorMessage,
  children,
}: ListStateProps) => {
  if (loading) {
    return (
      <Card>
        <p className="text-center text-sm text-slate-600">Loading…</p>
      </Card>
    );
  }

  if (errorMessage) {
    return (
      <Card>
        <InlineAlert variant="error" message={errorMessage} />
      </Card>
    );
  }

  if (!hasItems) {
    return (
      <Card>
        <div className="text-center text-sm text-slate-600">
          <div className="font-semibold text-slate-800">{emptyTitle}</div>
          <div>{emptyMessage}</div>
        </div>
      </Card>
    );
  }

  return <>{children}</>;
};

export default ListState;
