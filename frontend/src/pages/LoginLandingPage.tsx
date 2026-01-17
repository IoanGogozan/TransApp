import CompanySlugForm from "../components/CompanySlugForm";
import PublicHeader from "../components/PublicHeader";
import Card from "../components/ui/Card";
import SectionHeader from "../components/ui/SectionHeader";

const LoginLandingPage = () => {
  return (
    <div className="min-h-screen flex items-start justify-center p-5">
      <Card className="w-full max-w-md">
        <PublicHeader />
        <SectionHeader title="Sign in" />
        <CompanySlugForm
          embedded
          title="Sign in"
          subtitle="Enter your company slug to go to the login page."
          submitLabel="Continue"
        />
      </Card>
    </div>
  );
};

export default LoginLandingPage;


