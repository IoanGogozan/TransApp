import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import PublicLayout from "../components/layout/PublicLayout";
import Card from "../components/ui/Card";

const PublicTermsPage = () => {
  const [activeSectionId, setActiveSectionId] = useState("using-transapp");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const suppressObserverRef = useRef(false);
  const suppressTimeoutRef = useRef<number | null>(null);
  const dropdownRef = useRef<HTMLDetailsElement | null>(null);
  const summaryRef = useRef<HTMLElement | null>(null);
  const sectionItems = useMemo(
    () => [
      { id: "using-transapp", label: "Using TransApp" },
      { id: "accounts-and-roles", label: "Accounts and roles" },
      { id: "subscription-trial-billing", label: "Subscription, trial and billing" },
      { id: "grace-period", label: "Grace period" },
      { id: "acceptable-use", label: "Acceptable use" },
      { id: "data-documents-exports", label: "Data, documents and exports" },
      { id: "availability-and-changes", label: "Availability and changes" },
      { id: "termination", label: "Termination" },
      { id: "contact", label: "Contact" },
    ],
    []
  );
  const sectionIds = useMemo(() => sectionItems.map((item) => item.id), [sectionItems]);

  useEffect(() => {
    const hashId = window.location.hash.replace("#", "");
    if (hashId && sectionIds.includes(hashId)) {
      setActiveSectionId(hashId);
    } else if (!hashId) {
      setActiveSectionId(sectionItems[0]?.id ?? "using-transapp");
    }
  }, [sectionIds, sectionItems]);

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
    <PublicLayout contentClassName="mt-5 sm:mt-7">
      <Card className="w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="mx-auto w-full max-w-3xl space-y-8">
          <div className="space-y-4">
            <div className="space-y-2">
            <h1 className="text-xl font-semibold text-slate-900">Terms of Service</h1>
            <p className="text-sm leading-relaxed text-slate-600">
              These terms govern the use of TransApp. By registering a company or using the service, you agree to these terms.
            </p>
            </div>
            <div className="flex flex-col gap-2">
              <details
                ref={dropdownRef}
                className="w-full max-w-[520px]"
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
          </div>

          <section className="space-y-3">
            <h2 id="using-transapp" className="scroll-mt-24 text-base font-semibold text-slate-900">
              Using TransApp
            </h2>
            <p className="text-sm leading-relaxed text-slate-700">
              TransApp is a multi-tenant web application for Norwegian transport companies for time tracking, vehicle check-ins,
              and admin review/exports.
            </p>
          </section>

          <section className="space-y-3 border-t border-slate-200 pt-6">
            <h2 id="accounts-and-roles" className="scroll-mt-24 text-base font-semibold text-slate-900">
              Accounts and roles
            </h2>
            <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
              <li>Company admins manage users, drivers, vehicles, customers, routes, and documents.</li>
              <li>Drivers are created by company admins (drivers do not self-register).</li>
              <li>You are responsible for keeping login credentials secure and for actions taken in your workspace.</li>
            </ul>
          </section>

          <section className="space-y-3 border-t border-slate-200 pt-6">
            <h2 id="subscription-trial-billing" className="scroll-mt-24 text-base font-semibold text-slate-900">
              Subscription, trial and billing
            </h2>
            <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
              <li>14-day free trial is available for new company registrations.</li>
              <li>No credit card is required to start the trial.</li>
              <li>Paid subscriptions are billed monthly.</li>
              <li>Payments are processed via Vipps Recurring and Stripe.</li>
            </ul>
          </section>

          <section className="space-y-3 border-t border-slate-200 pt-6">
            <h2 id="grace-period" className="scroll-mt-24 text-base font-semibold text-slate-900">
              Grace period
            </h2>
            <p className="text-sm leading-relaxed text-slate-700">
              After a subscription ends or payment fails, TransApp provides a 7-day grace period to resolve billing and keep
              access to the workspace.
            </p>
          </section>

          <section className="space-y-3 border-t border-slate-200 pt-6">
            <h2 id="acceptable-use" className="scroll-mt-24 text-base font-semibold text-slate-900">
              Acceptable use
            </h2>
            <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
              <li>Do not misuse the service or attempt to access other companies' data.</li>
              <li>Do not upload malicious files or content.</li>
              <li>Do not overload the service (abuse protection such as rate limits may apply).</li>
            </ul>
          </section>

          <section className="space-y-3 border-t border-slate-200 pt-6">
            <h2 id="data-documents-exports" className="scroll-mt-24 text-base font-semibold text-slate-900">
              Data, documents and exports
            </h2>
            <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
              <li>Your company is responsible for the accuracy of data entered (time entries, check-ins, and records).</li>
              <li>
                Documents/uploads are provided by your company users; you should avoid uploading sensitive data unless
                necessary for operations.
              </li>
              <li>Exports are provided "as-is" to support payroll, billing, and audit workflows.</li>
            </ul>
          </section>

          <section className="space-y-3 border-t border-slate-200 pt-6">
            <h2 id="availability-and-changes" className="scroll-mt-24 text-base font-semibold text-slate-900">
              Availability and changes
            </h2>
            <p className="text-sm leading-relaxed text-slate-700">
              We work to keep the service available and improve it over time. Features and limits may change as we evolve the product.
            </p>
          </section>

          <section className="space-y-3 border-t border-slate-200 pt-6">
            <h2 id="termination" className="scroll-mt-24 text-base font-semibold text-slate-900">
              Termination
            </h2>
            <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
              <li>You may stop using the service at any time.</li>
              <li>We may suspend access in cases of abuse, security risks, or non-payment.</li>
            </ul>
          </section>

          <section className="space-y-3 border-t border-slate-200 pt-6">
            <h2 id="contact" className="scroll-mt-24 text-base font-semibold text-slate-900">
              Contact
            </h2>
            <p className="text-sm leading-relaxed text-slate-700">
              Support contact is coming soon. For now, please see the{" "}
              <Link className="hover:text-slate-900 hover:underline" to="/help">Help &amp; Getting Started</Link> page.
            </p>
          </section>

          <div className="border-t border-slate-200 pt-4">
            <p className="text-xs text-slate-500">Last updated: 2026-01-11</p>
          </div>
        </div>
      </Card>
    </PublicLayout>
  );
};

export default PublicTermsPage;
