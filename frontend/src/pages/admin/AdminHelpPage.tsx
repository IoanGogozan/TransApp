import HelpContent from "../../components/HelpContent";
import Card from "../../components/ui/Card";
import SectionHeader from "../../components/ui/SectionHeader";

const AdminHelpPage = () => {
  return (
    <div className="min-h-screen w-full px-3 py-4 sm:px-6 sm:py-6">
      <style>
        {`
          .help-content h2 {
            font-size: 1rem;
            font-weight: 600;
            color: #0f172a;
            margin: 0;
          }
          .help-content .pill-list {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
            list-style: none;
            padding-left: 0;
            margin-top: 12px;
          }
          @media (min-width: 640px) {
            .help-content .pill-list {
              grid-template-columns: repeat(3, minmax(0, 1fr));
            }
          }
          @media (min-width: 1024px) {
            .help-content .pill-list {
              grid-template-columns: repeat(4, minmax(0, 1fr));
            }
          }
          .help-content .pill-link {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            text-align: center;
            border-radius: 12px;
            border: 1px solid #e2e8f0;
            background: #f8fafc;
            padding: 12px 16px;
            font-size: 14px;
            font-weight: 500;
            color: #1f2937;
            box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
            transition: background-color 150ms ease, box-shadow 150ms ease;
          }
          .help-content .pill-link:hover {
            background: #f1f5f9;
            box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
          }
          .help-content > div {
            margin-top: 24px;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            background: #fff;
            padding: 16px;
          }
          .help-content > div + div {
            margin-top: 24px;
          }
          .help-content ul:not(.pill-list) {
            list-style: disc;
            padding-left: 20px;
            margin: 12px 0 0;
            font-size: 0.9375rem;
            color: #334155;
          }
          .help-content ul:not(.pill-list) li {
            margin-top: 8px;
          }
          .help-content ul:not(.pill-list) li::marker {
            color: #94a3b8;
          }
          .help-content .divider {
            display: none;
          }
        `}
      </style>
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
          <div className="help-content">
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
