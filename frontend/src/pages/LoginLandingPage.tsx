import CompanySlugForm from "../components/CompanySlugForm";
import PublicLayout from "../components/layout/PublicLayout";
import Card from "../components/ui/Card";
import SectionHeader from "../components/ui/SectionHeader";

const LoginLandingPage = () => {
  return (
    <PublicLayout contentClassName="mt-5 sm:mt-7">
      <div className="mx-auto w-full max-w-[560px] sm:max-w-[600px]">
        <Card className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm sm:p-6">
          <div className="space-y-4 sm:space-y-6 [&_form]:mt-5 [&_form]:space-y-4 sm:[&_form]:space-y-5 [&_p]:leading-relaxed">
            <SectionHeader title="Sign in" />
            <CompanySlugForm
              embedded
              title="Sign in"
              subtitle="Enter your company slug to continue to your workspace."
              submitLabel="Continue"
            />
          </div>
        </Card>
      </div>
    </PublicLayout>
  );
};

export default LoginLandingPage;


