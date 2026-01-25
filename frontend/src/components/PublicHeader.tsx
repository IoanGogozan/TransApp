import { Link } from "react-router-dom";

const PublicHeader = () => {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[980px] items-center justify-between px-1 py-3.5">
        <Link to="/" className="text-lg font-bold text-slate-900 hover:underline">
          TransApp
        </Link>
        <nav className="flex flex-wrap items-center gap-4 text-sm">
          <Link to="/#pricing" className="text-blue-600 hover:underline">
            Pricing
          </Link>
          <Link to="/help" className="text-blue-600 hover:underline">
            Help
          </Link>
          <Link to="/login" className="text-blue-600 hover:underline">
            Sign in
          </Link>
          <Link to="/register" className="text-blue-600 hover:underline">
            Register company
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default PublicHeader;
