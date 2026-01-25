import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import Card from "../ui/Card";

type PublicLayoutProps = {
  children: ReactNode;
  contentClassName?: string;
};

const PublicLayout = ({ children, contentClassName }: PublicLayoutProps) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen w-full bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl">
        <Card className="w-full">
          <div className="sticky top-0 z-30 -mx-4 border-b border-slate-200 bg-white/80 px-4 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
            <div className="mx-auto w-full max-w-6xl">
              <div className="flex items-center justify-between py-3">
                <Link to="/" className="text-lg font-bold text-slate-900">
                  TransApp
                </Link>
                <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
                  <Link to="/#pricing" className="text-slate-600 hover:text-slate-900 hover:underline">
                    Pricing
                  </Link>
                  <Link to="/help" className="text-slate-600 hover:text-slate-900 hover:underline">
                    Help
                  </Link>
                  <Link to="/login" className="text-slate-600 hover:text-slate-900 hover:underline">
                    Sign in
                  </Link>
                  <Link
                    to="/register"
                    className="ml-2 inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 hover:shadow-md"
                  >
                    Register company
                  </Link>
                </nav>
                <button
                  type="button"
                  className="md:hidden inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm hover:bg-slate-50"
                  onClick={() => setMenuOpen((v) => !v)}
                >
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <line x1="4" y1="6" x2="20" y2="6" />
                    <line x1="4" y1="12" x2="20" y2="12" />
                    <line x1="4" y1="18" x2="20" y2="18" />
                  </svg>
                </button>
              </div>
              {menuOpen ? (
                <div className="md:hidden pb-3">
                  <div className="mt-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
                    <div className="flex flex-col">
                      <Link
                        to="/#pricing"
                        className="rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        onClick={() => setMenuOpen(false)}
                      >
                        Pricing
                      </Link>
                      <Link
                        to="/help"
                        className="rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        onClick={() => setMenuOpen(false)}
                      >
                        Help
                      </Link>
                      <Link
                        to="/login"
                        className="rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        onClick={() => setMenuOpen(false)}
                      >
                        Sign in
                      </Link>
                      <Link
                        to="/register"
                        className="mt-1 rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                        onClick={() => setMenuOpen(false)}
                      >
                        Register company
                      </Link>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
          <div className={contentClassName ?? "mt-4 space-y-4 sm:space-y-6"}>{children}</div>
        </Card>
      </div>
    </div>
  );
};

export default PublicLayout;
