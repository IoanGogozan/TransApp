import { ReactElement } from "react";
import { useAuth } from "../auth/AuthContext";
import ButtonLink from "./ui/ButtonLink";
import Card from "./ui/Card";

type Props = {
  children: ReactElement;
};

const DriverRoute = ({ children }: Props) => {
  const { user, loading, error } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-start justify-center p-5">
        <Card>
          <p>Loading...</p>
        </Card>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen flex items-start justify-center p-5">
        <Card>
          <div className="error">{error || "Unable to load user"}</div>
          <ButtonLink variant="secondary" to="/" className="w-auto">
            Back home
          </ButtonLink>
        </Card>
      </div>
    );
  }

  const allowedRoles = new Set(["DRIVER", "ADMIN", "PLATFORM_ADMIN"]);
  if (!allowedRoles.has(user.role)) {
    return (
      <div className="min-h-screen flex items-start justify-center p-5">
        <Card>
          <div className="error">Not authorized</div>
          <ButtonLink variant="secondary" to="/" className="w-auto">
            Go to home
          </ButtonLink>
        </Card>
      </div>
    );
  }

  return children;
};

export default DriverRoute;
