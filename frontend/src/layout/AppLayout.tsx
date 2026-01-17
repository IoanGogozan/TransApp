import { Link, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import AppShell from "../layouts/AppShell";
import { getBillingStatus } from "../api/billing";
import PageContainer from "../components/PageContainer";
import ButtonLink from "../components/ui/ButtonLink";

const AppLayout = () => {
  const { company } = useAuth();
  const location = useLocation();
  const slugPrefix = company?.slug ? `/c/${company.slug}` : "";
  const [subscriptionInactive, setSubscriptionInactive] = useState<string | null>(null);
  const missingSlug =
    !location.pathname.startsWith("/c/") &&
    (location.pathname.startsWith("/admin") || location.pathname.startsWith("/driver"));

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ status?: string | null }>).detail;
      setSubscriptionInactive(detail?.status ?? null);
    };
    window.addEventListener("subscription-inactive", handler);
    return () => window.removeEventListener("subscription-inactive", handler);
  }, []);

  useEffect(() => {
    if (!company?.slug) return undefined;

    let cancelled = false;
    const graceMs = 7 * 24 * 60 * 60 * 1000;

    const refreshStatus = async () => {
      try {
        const res = await getBillingStatus(company.slug);
        const status = res.subscription?.status;
        if (!status) return;

        if (status === "CANCELED") {
          if (!cancelled) setSubscriptionInactive("CANCELED");
          return;
        }
        if (status === "ACTIVE" || status === "TRIALING") {
          if (!cancelled) setSubscriptionInactive(null);
          return;
        }
        if (status === "PAST_DUE") {
          const pastDueAt = res.subscription?.pastDueAt
            ? new Date(res.subscription.pastDueAt).getTime()
            : null;
          const expired = pastDueAt ? Date.now() >= pastDueAt + graceMs : false;
          if (!cancelled) setSubscriptionInactive(expired ? "PAST_DUE" : null);
        }
      } catch {
        // Ignore billing status errors to avoid blocking the UI.
      }
    };

    refreshStatus();
    const intervalId = setInterval(refreshStatus, 30_000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [company?.slug]);

  return (
    <div>
      <AppShell>
        {subscriptionInactive !== null ? (
          <div
            className="sticky top-0 z-50"
            style={{
              position: "sticky",
              top: 0,
              zIndex: 50,
              background: "#fee2e2",
              color: "#991b1b",
              padding: "10px 16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "10px",
              marginBottom: "12px",
            }}
          >
            <div>Subscription inactive. Go to Billing to reactivate.</div>
            {company?.slug ? (
              <ButtonLink
                variant="secondary"
                to={`/c/${company.slug}/app/admin/billing`}
                className="w-auto"
              >
                Open Billing
              </ButtonLink>
            ) : null}
          </div>
        ) : null}
        <PageContainer>
          <Outlet />
        </PageContainer>
      </AppShell>
      {missingSlug && company?.slug ? (
        <div
          style={{
            background: "#fef3c7",
            color: "#92400e",
            padding: "10px 16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div>Tenant slug missing in URL. You may be redirected to tenant-aware route.</div>
          <ButtonLink variant="secondary" to={`${slugPrefix}${location.pathname}`} className="w-auto">
            Go to {company.slug}
          </ButtonLink>
        </div>
      ) : null}
    </div>
  );
};

export default AppLayout;
