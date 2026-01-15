import CompanySlugForm from "../components/CompanySlugForm";
import PublicHeader from "../components/PublicHeader";

const LoginLandingPage = () => {
  return (
    <div className="page">
      <PublicHeader />
      <div className="card">
        <CompanySlugForm
          embedded
          title="Sign in"
          subtitle="Enter your company slug to go to the login page."
          submitLabel="Continue"
        />
      </div>
    </div>
  );
};

export default LoginLandingPage;


