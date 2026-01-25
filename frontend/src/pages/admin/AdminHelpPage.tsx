import HelpContent from "../../components/HelpContent";
import Card from "../../components/ui/Card";
import SectionHeader from "../../components/ui/SectionHeader";

const AdminHelpPage = () => {
  return (
    <div className="min-h-screen w-full px-3 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div className="mb-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Help</h1>
            <span className="rounded-full bg-slate-900/5 px-3 py-1 text-xs font-medium text-slate-700">
              Admin guide
            </span>
          </div>
          <p className="mt-2 text-sm sm:text-base text-slate-600 max-w-3xl">
            Help &amp; Getting Started
          </p>
        </div>
        <Card className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
          <div>
            <HelpContent />
          </div>
          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
            <h2 className="text-base sm:text-lg font-semibold text-slate-900">Need more help?</h2>
            <p className="mt-2 text-sm text-slate-700 leading-6">
              Reach out anytime and we will guide you through the next steps.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Contact support
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
              >
                View documentation
              </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AdminHelpPage;
