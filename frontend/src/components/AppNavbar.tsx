import { useState } from "react";
import AppDrawerMenu from "./AppDrawerMenu";

type AppNavbarProps = {
  companyName: string;
  userLabel: string;
  onLogout: () => void;
  menuItems: { label: string; path: string }[];
  onNavigate: (path: string) => void;
  homePath: string;
  currentPath: string;
  resolvePath: (path: string) => string;
};

const AppNavbar = ({
  companyName,
  userLabel,
  onLogout,
  menuItems,
  onNavigate,
  homePath,
  currentPath,
  resolvePath,
}: AppNavbarProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      <nav
        style={{
          height: "48px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          background: "#111827",
          color: "#fff",
          gap: "12px",
          position: "sticky",
          top: 0,
          zIndex: 60,
          width: "100%",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            className="button secondary"
            type="button"
            onClick={() => setIsMenuOpen(true)}
            aria-label="Open menu"
            aria-expanded={isMenuOpen}
            style={{ width: "auto", padding: "6px 10px", fontSize: "14px" }}
          >
            ☰
          </button>
          <button
            type="button"
            onClick={() => onNavigate(homePath)}
            title={companyName}
            style={{
              fontWeight: 700,
              maxWidth: "240px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              background: "transparent",
              border: "none",
              padding: 0,
              color: "inherit",
              cursor: "pointer",
            }}
          >
            {companyName}
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span className="muted max-w-[140px] truncate sm:max-w-[220px]" style={{ color: "#cbd5f5", fontSize: "13px" }}>
            {userLabel}
          </span>
          <button
            className="button secondary"
            type="button"
            onClick={onLogout}
            style={{ width: "auto", padding: "6px 10px", fontSize: "13px" }}
          >
            Logout
          </button>
        </div>
      </nav>
      <AppDrawerMenu open={isMenuOpen} onClose={() => setIsMenuOpen(false)} title={companyName}>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {menuItems.map((item) => {
            const resolvedPath = resolvePath(item.path);
            const isActive = currentPath === resolvedPath;
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  onNavigate(item.path);
                }}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  background: isActive ? "#e5e7eb" : "transparent",
                  fontWeight: isActive ? 700 : 600,
                  border: "none",
                  cursor: "pointer",
                }}
                onMouseEnter={(event) => {
                  if (isActive) return;
                  event.currentTarget.style.background = "#f3f4f6";
                }}
                onMouseLeave={(event) => {
                  if (isActive) return;
                  event.currentTarget.style.background = "transparent";
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </AppDrawerMenu>
    </>
  );
};

export default AppNavbar;
