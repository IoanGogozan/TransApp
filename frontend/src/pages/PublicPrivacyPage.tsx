import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import PublicLayout from "../components/layout/PublicLayout";
import Card from "../components/ui/Card";

const PublicPrivacyPage = () => {
  const [activeSectionId, setActiveSectionId] = useState("what-data");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const suppressObserverRef = useRef(false);
  const suppressTimeoutRef = useRef<number | null>(null);
  const dropdownRef = useRef<HTMLDetailsElement | null>(null);
  const summaryRef = useRef<HTMLElement | null>(null);
  const sectionItems = useMemo(
    () => [
      { id: "what-data", label: "What data we process" },
      { id: "why", label: "Why we process it" },
      { id: "payments", label: "Payments" },
      { id: "retention", label: "Retention" },
      { id: "contact", label: "Contact" },
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
    <PublicLayout contentClassName="mt-5 sm:mt-7">
      <Card className="w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="mx-auto w-full max-w-3xl space-y-8">
          <div className="space-y-4" id="top">
            <div className="space-y-2">
              <h1 className="text-xl font-semibold text-slate-900">Privacy</h1>
              <p className="text-sm leading-relaxed text-slate-600">
                A short plain-language overview of how TransApp processes data.
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
            <h2 id="what-data" className="scroll-mt-24 text-base font-semibold text-slate-900">
              What data we process
            </h2>
            <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
              <li>
                <strong>Account data</strong> (name, email, phone, username)
              </li>
              <li>
                <strong>Company and tenant identifiers</strong> (company slug, company settings)
              </li>
              <li>
                <strong>Work time entries</strong> (date, activity type, durations, optional customer/route/vehicle)
              </li>
              <li>
                <strong>Vehicle check-ins</strong> (driver, vehicle, timestamp, answers/notes if any)
              </li>
              <li>
                <strong>Documents/uploads metadata</strong> (file name, type, size, uploader, timestamps)
              </li>
              <li>
                <strong>Technical logs</strong> (timestamps, IP address, user agent) for security and troubleshooting
              </li>
            </ul>
          </section>

          <section className="space-y-3 border-t border-slate-200 pt-6">
            <h2 id="why" className="scroll-mt-24 text-base font-semibold text-slate-900">
              Why we process it
            </h2>
            <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
              <li>
                <strong>Provide the service</strong> (time tracking, check-ins, admin review)
              </li>
              <li>
                <strong>Generate exports</strong> (payroll/billing/audit CSV)
              </li>
              <li>
                <strong>Security and abuse prevention</strong> (rate limits, monitoring)
              </li>
              <li>
                <strong>Support and troubleshooting</strong>
              </li>
            </ul>
          </section>

          <section className="space-y-3 border-t border-slate-200 pt-6">
            <h2 id="payments" className="scroll-mt-24 text-base font-semibold text-slate-900">
              Payments
            </h2>
            <p className="text-sm leading-relaxed text-slate-700">
              Subscriptions are handled via Vipps Recurring and Stripe. TransApp stores only payment identifiers and
              subscription status where possible. Webhooks are verified to prevent tampering.
            </p>
          </section>

          <section className="space-y-3 border-t border-slate-200 pt-6">
            <h2 id="retention" className="scroll-mt-24 text-base font-semibold text-slate-900">
              Retention
            </h2>
            <div className="space-y-2 text-sm leading-relaxed text-slate-700">
              <p>We retain records as required for the service and company audit needs.</p>
              <p>Company admins control operational data (e.g. driver records, exports).</p>
              <p>We may retain logs for security and troubleshooting for a limited period.</p>
            </div>
          </section>

          <section className="space-y-3 border-t border-slate-200 pt-6">
            <h2 id="contact" className="scroll-mt-24 text-base font-semibold text-slate-900">
              Contact
            </h2>
            <p className="text-sm leading-relaxed text-slate-700">
              Support contact is coming soon. For now, please use the <Link to="/help">Help</Link> page.
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

export default PublicPrivacyPage;



