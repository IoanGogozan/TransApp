import { ReactNode } from "react";

type AppDrawerMenuProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
};

const AppDrawerMenu = ({ open, onClose, title, children }: AppDrawerMenuProps) => {
  if (!open) return null;

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.45)",
        zIndex: 100,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "280px",
          height: "100%",
          background: "#fff",
          boxShadow: "0 12px 40px rgba(15, 23, 42, 0.2)",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
          <strong>{title}</strong>
          <button className="button secondary" type="button" onClick={onClose} style={{ width: "auto", padding: "6px 10px" }}>
            X
          </button>
        </div>
        <div style={{ overflowY: "auto" }}>{children}</div>
      </div>
    </div>
  );
};

export default AppDrawerMenu;
