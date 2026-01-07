import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ApiError } from "../../api/http";
import { getBillingStatus, BillingStatusResponse, syncVippsAgreement } from "../../api/billing";
import { tenantPath } from "../../utils/tenantPath";
import { getCompanySlug } from "../../auth/companySlug";

const POLL_INTERVAL_MS = 2000;
const TIMEOUT_MS = 60000;

const VippsReturnPage = () => {
  const { companySlug } = useParams<{ companySlug?: string }>();
  const slug = companySlug || getCompanySlug() || undefined;
  const [status, setStatus] = useState<BillingStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [syncing, setSyncing] = useState(true);
  const returnPath = useMemo(() => tenantPath(slug, "/billing"), [slug]);

  useEffect(() => {
    let intervalId: number | undefined;
    let canceled = false;
    const start = Date.now();

    const poll = async () => {
      try {
        const data = await getBillingStatus(slug);
        if (canceled) return;
        setStatus(data);
        if (data.subscription?.vippsAgreementStatus === "ACTIVE") {
          setDone(true);
          if (intervalId) window.clearInterval(intervalId);
          return;
        }
      } catch (err) {
        if (canceled) return;
        const message = err instanceof ApiError ? err.message : "Failed to check billing status.";
        setError(message);
      }

      if (Date.now() - start >= TIMEOUT_MS) {
        setTimedOut(true);
        if (intervalId) window.clearInterval(intervalId);
      }
    };

    const startPolling = () => {
      poll();
      intervalId = window.setInterval(poll, POLL_INTERVAL_MS);
    };

    const sync = async () => {
      setSyncing(true);
      try {
        await syncVippsAgreement(slug);
      } catch (err) {
        if (!canceled) {
          const message = err instanceof ApiError ? err.message : "Failed to sync Vipps agreement.";
          setError(message);
        }
      } finally {
        if (!canceled) setSyncing(false);
        startPolling();
      }
    };

    sync();

    return () => {
      canceled = true;
      if (intervalId) window.clearInterval(intervalId);
    };
  }, []);

  return (
    <div className="page">
      <div className="card">
        <h1>Vipps approval</h1>
        <p className="muted">
          {syncing
            ? "Syncing Vipps agreement status..."
            : "We are checking your Vipps agreement status."}
        </p>
        {error ? <div className="error">{error}</div> : null}
        {done ? (
          <div>
            <p>Vipps agreement activated successfully.</p>
            <Link className="button" to={returnPath}>
              Back to billing
            </Link>
          </div>
        ) : timedOut ? (
          <div>
            <p>Approval pending, check later.</p>
            <Link className="button" to={returnPath}>
              Back to billing
            </Link>
          </div>
        ) : (
          <div>
            <p>Waiting for confirmation...</p>
            <p className="muted">
              Status: {status?.subscription?.vippsAgreementStatus || "PENDING"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VippsReturnPage;
