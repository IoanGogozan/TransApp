import { Link } from "react-router-dom";
import HelpContent from "../components/HelpContent";
import PublicLayout from "../components/layout/PublicLayout";
import Card from "../components/ui/Card";
import SectionHeader from "../components/ui/SectionHeader";

const PublicHelpPage = () => {
  return (
    <PublicLayout contentClassName="mt-5 sm:mt-7">
      <Card className="w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <SectionHeader title="Help" />
        <div>
          <HelpContent />
        </div>
        <h3 className="mt-6 text-sm font-semibold text-slate-900">More</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          <Link
            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-900 hover:bg-slate-50"
            to="/privacy"
          >
            Privacy
          </Link>
          <Link
            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-900 hover:bg-slate-50"
            to="/security"
          >
            Security
          </Link>
          <Link
            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-900 hover:bg-slate-50"
            to="/terms"
          >
            Terms
          </Link>
        </div>
      </Card>
    </PublicLayout>
  );
};

export default PublicHelpPage;



