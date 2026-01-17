import { ReactNode, useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import AppNavbar from "../components/AppNavbar";
import { adminMenuItems, driverMenuItems } from "../components/appMenuConfig";
import { tenantPath } from "../utils/tenantPath";

type AppShellProps = {
  children: ReactNode;
};

const AppShell = ({ children }: AppShellProps) => {
  const { user, role, company, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { companySlug } = useParams<{ companySlug?: string }>();
  const companyName = company?.name || "Company";
  const userLabel = user?.email || user?.phone || user?.username || "User";
  const slug = companySlug || company?.slug || "";
  const menuItems = useMemo(
    () => (role === "ADMIN" || role === "PLATFORM_ADMIN" ? adminMenuItems : driverMenuItems),
    [role],
  );
  const homePath = role === "ADMIN" || role === "PLATFORM_ADMIN"
    ? "/app"
    : "/driver/timesheet";
  const resolvePath = (path: string) => tenantPath(slug, path);

  const handleNavigate = (path: string) => {
    navigate(resolvePath(path));
  };

  return (
    <div>
      <AppNavbar
        companyName={companyName}
        userLabel={userLabel}
        onLogout={logout}
        menuItems={menuItems}
        onNavigate={handleNavigate}
        homePath={homePath}
        currentPath={location.pathname}
        resolvePath={resolvePath}
      />
      <div>{children}</div>
    </div>
  );
};

export default AppShell;
