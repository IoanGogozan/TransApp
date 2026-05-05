import { useEffect, useMemo, useRef, useState } from "react";

const HelpContent = () => {
  const [activeSectionId, setActiveSectionId] = useState("admin-setup-checklist");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const suppressObserverRef = useRef(false);
  const suppressTimeoutRef = useRef<number | null>(null);
  const dropdownRef = useRef<HTMLDetailsElement | null>(null);
  const summaryRef = useRef<HTMLElement | null>(null);
  const sectionItems = useMemo(
    () => [
      { id: "admin-setup-checklist", label: "Admin setup checklist" },
      { id: "admin-users-and-drivers", label: "Users & drivers" },
      { id: "vehicles-customers-routes", label: "Vehicles / customers / routes" },
      { id: "review-and-corrections", label: "Review & corrections" },
      { id: "exports", label: "Exports" },
      { id: "billing", label: "Billing" },
      { id: "driver-basics", label: "Driver basics" },
      { id: "login-and-password", label: "Login & password" },
    ],
    []
  );
  const sectionIds = useMemo(() => sectionItems.map((item) => item.id), [sectionItems]);

  useEffect(() => {
    const sections = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (!sections.length) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (suppressObserverRef.current) {
          return;
        }
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target?.id) {
          setActiveSectionId(visible.target.id);
        }
      },
      { rootMargin: "-25% 0px -65% 0px", threshold: [0.1, 0.3, 0.6] }
    );

    sections.forEach((section) => observer.observe(section));

    return () => {
      observer.disconnect();
    };
  }, [sectionIds]);

  useEffect(() => {
    if (!isDropdownOpen) {
      return undefined;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (dropdownRef.current && target && !dropdownRef.current.contains(target)) {
        dropdownRef.current.removeAttribute("open");
        setIsDropdownOpen(false);
        summaryRef.current?.focus();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        dropdownRef.current?.removeAttribute("open");
        setIsDropdownOpen(false);
        summaryRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDropdownOpen]);

  const handleJumpChange = (id: string) => {
    if (suppressTimeoutRef.current) {
      window.clearTimeout(suppressTimeoutRef.current);
    }
    suppressObserverRef.current = true;
    setActiveSectionId(id);
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    window.location.hash = id;
    dropdownRef.current?.removeAttribute("open");
    setIsDropdownOpen(false);
    summaryRef.current?.focus();
    suppressTimeoutRef.current = window.setTimeout(() => {
      suppressObserverRef.current = false;
    }, 400);
  };

  return (
    <div className="space-y-4">
      <div id="top">
        <h1 className="text-xl font-bold text-slate-900">Help & Getting Started</h1>
        <p className="mt-1 text-sm text-slate-600">
          Admin-focused guidance for setting up your workspace and managing records. Drivers can find basics below.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <details
          ref={dropdownRef}
          className="w-full sm:max-w-[400px]"
          onToggle={(event) => {
            const isOpen = (event.currentTarget as HTMLDetailsElement).open;
            setIsDropdownOpen(isOpen);
          }}
        >
          <summary
            ref={summaryRef}
            className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            <span>{sectionItems.find((item) => item.id === activeSectionId)?.label}</span>
            <svg
              className="h-4 w-4 text-slate-500"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M6 8l4 4 4-4" />
            </svg>
          </summary>
          <div className="mt-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
            <div className="max-h-64 overflow-y-auto">
              {sectionItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-sm ${
                    activeSectionId === item.id
                      ? "bg-slate-100 text-slate-900"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                  onClick={() => handleJumpChange(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </details>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 id="admin-setup-checklist" className="scroll-mt-28 text-sm font-semibold text-slate-900">
          Admin: setup checklist
        </h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>Add vehicles</li>
          <li>Create drivers</li>
          <li>Add customers and routes (optional)</li>
          <li>Ask a driver to log a test day</li>
          <li>Review the records and run a test export</li>
        </ul>
        <hr className="mt-3 border-t border-slate-200" />
        <a className="mt-3 inline-flex text-xs text-slate-500 hover:text-slate-700 hover:underline" href="#top">
          Back to top
        </a>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 id="admin-users-and-drivers" className="scroll-mt-28 text-sm font-semibold text-slate-900">
          Admin: users & drivers
        </h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>Drivers are created by company admins (drivers do not self-register)</li>
          <li>Assign roles (ADMIN or DRIVER)</li>
          <li>Deactivate users when needed</li>
          <li>Reset a user password from Admin  Users</li>
        </ul>
        <hr className="mt-3 border-t border-slate-200" />
        <a className="mt-3 inline-flex text-xs text-slate-500 hover:text-slate-700 hover:underline" href="#top">
          Back to top
        </a>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 id="vehicles-customers-routes" className="scroll-mt-28 text-sm font-semibold text-slate-900">
          Admin: vehicles / customers / routes
        </h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>Create vehicles used by drivers</li>
          <li>Add customers and routes if you use them for billing</li>
          <li>Keep naming consistent for clean exports</li>
        </ul>
        <hr className="mt-3 border-t border-slate-200" />
        <a className="mt-3 inline-flex text-xs text-slate-500 hover:text-slate-700 hover:underline" href="#top">
          Back to top
        </a>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 id="review-and-corrections" className="scroll-mt-28 text-sm font-semibold text-slate-900">
          Admin: review & corrections
        </h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>Review daily entries submitted by drivers</li>
          <li>Correct records when needed</li>
          <li>Use notes/comments when available to keep changes auditable</li>
        </ul>
        <hr className="mt-3 border-t border-slate-200" />
        <a className="mt-3 inline-flex text-xs text-slate-500 hover:text-slate-700 hover:underline" href="#top">
          Back to top
        </a>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 id="exports" className="scroll-mt-28 text-sm font-semibold text-slate-900">
          Admin: exports
        </h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>Generate CSV exports for payroll, billing, and audit</li>
          <li>Verify date range and filters</li>
          <li>If something is missing, check the driver's day entries first</li>
        </ul>
        <hr className="mt-3 border-t border-slate-200" />
        <a className="mt-3 inline-flex text-xs text-slate-500 hover:text-slate-700 hover:underline" href="#top">
          Back to top
        </a>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 id="billing" className="scroll-mt-28 text-sm font-semibold text-slate-900">
          Admin: billing
        </h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>Manage subscription in Admin  Billing</li>
          <li>Plans are billed monthly (prices eks. mva.)</li>
        </ul>
        <hr className="mt-3 border-t border-slate-200" />
        <a className="mt-3 inline-flex text-xs text-slate-500 hover:text-slate-700 hover:underline" href="#top">
          Back to top
        </a>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 id="driver-basics" className="scroll-mt-28 text-sm font-semibold text-slate-900">
          Driver: basics
        </h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>Log daily work entries (DRIVING / OTHER WORK / BREAK / AVAILABILITY)</li>
          <li>Edit entries for a day and view weekly totals</li>
          <li>Complete daily vehicle check-in before driving</li>
        </ul>
        <hr className="mt-3 border-t border-slate-200" />
        <a className="mt-3 inline-flex text-xs text-slate-500 hover:text-slate-700 hover:underline" href="#top">
          Back to top
        </a>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 id="login-and-password" className="scroll-mt-28 text-sm font-semibold text-slate-900">
          Login & password
        </h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>Company slug is provided by your company admin</li>
          <li>If you cannot sign in, verify the company slug and your credentials</li>
          <li>Drivers: ask your admin to reset your password</li>
          <li>Admins: use "Forgot password" if available, or contact support (coming soon)</li>
        </ul>
        <a className="mt-3 inline-flex text-xs text-slate-500 hover:text-slate-700 hover:underline" href="#top">
          Back to top
        </a>
      </div>
    </div>
  );
};

export default HelpContent;
