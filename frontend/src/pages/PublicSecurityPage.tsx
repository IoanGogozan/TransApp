import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import PublicLayout from "../components/layout/PublicLayout";
import Card from "../components/ui/Card";

const PublicSecurityPage = () => {
  const [activeSectionId, setActiveSectionId] = useState("access-control");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const suppressObserverRef = useRef(false);
  const suppressTimeoutRef = useRef<number | null>(null);
  const dropdownRef = useRef<HTMLDetailsElement | null>(null);
  const summaryRef = useRef<HTMLSummaryElement | null>(null);
  const sectionItems = useMemo(
    () => [
      { id: "access-control", label: "Access control" },
      { id: "tenant-isolation", label: "Multi-tenant isolation" },
      { id: "payments-security", label: "Payments security" },
      { id: "uploads-documents", label: "Uploads & documents" },
      { id: "operational-hardening", label: "Operational hardening" },
      { id: "report-issue", label: "Report a security issue" },
    ],
    []
  );
  const sectionIds = useMemo(() => sectionItems.map((item) => item.id), [sectionItems]);

  useEffect(() => {
    const hashId = window.location.hash.replace("#", "");
    if (hashId && sectionIds.includes(hashId)) {
      setActiveSectionId(hashId);
    } else if (!hashId) {
      setActiveSectionId(sectionItems[0]?.id ?? "access-control");
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
          <div className="space-y-4" id="top">
            <div className="space-y-2">
              <h1 className="text-xl font-semibold text-slate-900">Security</h1>
              <p className="text-sm leading-relaxed text-slate-600">
                A short overview of security practices used in TransApp.
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
            <h2 id="access-control" className="scroll-mt-24 text-base font-semibold text-slate-900">
              Access control
            </h2>
            <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
              <li>Authentication required for workspace access</li>
              <li>Role-based access (Admin vs Driver)</li>
              <li>Drivers are created by company admins (no self-signup for drivers)</li>
            </ul>
          </section>

          <section className="mt-6 space-y-3 border-t border-slate-200 pt-6">
            <h2 id="tenant-isolation" className="scroll-mt-24 text-base font-semibold text-slate-900">
              Multi-tenant isolation
            </h2>
            <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
              <li>Data access is scoped to the current company workspace (tenant)</li>
              <li>Admin actions are limited to their own company</li>
            </ul>
          </section>

          <section className="mt-6 space-y-3 border-t border-slate-200 pt-6">
            <h2 id="payments-security" className="scroll-mt-24 text-base font-semibold text-slate-900">
              Payments security
            </h2>
            <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
              <li>Vipps Recurring and Stripe subscriptions</li>
              <li>Only identifiers/status stored where possible</li>
              <li>Verified webhooks and conflict prevention logic</li>
            </ul>
          </section>

          <section className="mt-6 space-y-3 border-t border-slate-200 pt-6">
            <h2 id="uploads-documents" className="scroll-mt-24 text-base font-semibold text-slate-900">
              Uploads &amp; documents
            </h2>
            <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
              <li>Upload limits and request size limits</li>
              <li>File type/size checks (where implemented)</li>
              <li>Audit-friendly metadata (uploader + timestamps)</li>
            </ul>
          </section>

          <section className="mt-6 space-y-3 border-t border-slate-200 pt-6">
            <h2 id="operational-hardening" className="scroll-mt-24 text-base font-semibold text-slate-900">
              Operational hardening
            </h2>
            <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
              <li>Rate limiting</li>
              <li>CORS allowlist</li>
              <li>Monitoring and logging for abuse prevention</li>
            </ul>
          </section>

          <section className="mt-6 space-y-3 border-t border-slate-200 pt-6">
            <h2 id="report-issue" className="scroll-mt-24 text-base font-semibold text-slate-900">
              Report a security issue
            </h2>
            <p className="text-sm leading-relaxed text-slate-700">
              Security contact is coming soon. Until then, please use the{" "}
              <Link className="hover:text-slate-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400" to="/help">
                Help page
              </Link>.
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

export default PublicSecurityPage;



