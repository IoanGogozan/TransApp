import { FormEvent, useEffect, useMemo, useState } from "react";
import { CardElement, Elements, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { ApiError } from "../../api/http";
import {
  BillingStatusResponse,
  createStripePortalSession,
  createStripeSetupIntent,
  createVippsAgreement,
  devActivate,
  devCancel,
  devPastDue,
  devResetTrial,
  getBillingStatus,
  subscribeStripe,
  getVippsCharges,
  changeVippsPlan,
  cancelVippsAgreement,
  syncVippsAgreement,
} from "../../api/billing";
import type { VippsCharge } from "../../api/billing";
import { useParams } from "react-router-dom";
import { getCompanySlug } from "../../auth/companySlug";

const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;
const stripePromise = stripeKey ? loadStripe(stripeKey) : null;

type StripeCardSetupFormProps = {
  plan: string;
  companySlug: string | undefined;
  onSuccess: () => Promise<void>;
};

const StripeCardSetupForm = ({ plan, companySlug, onSuccess }: StripeCardSetupFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    setError(null);
    try {
      const { clientSecret } = await createStripeSetupIntent(companySlug);
      const card = elements.getElement(CardElement);
      if (!card) {
        setError("Card input is not ready.");
        return;
      }

      const result = await stripe.confirmCardSetup(clientSecret, {
        payment_method: { card },
      });

      if (result.error) {
        setError(result.error.message || "Payment failed. Please try again.");
        return;
      }

      const paymentMethodId = result.setupIntent?.payment_method;
      if (!paymentMethodId || typeof paymentMethodId !== "string") {
        setError("Payment method not available.");
        return;
      }

      await subscribeStripe(companySlug, { plan, paymentMethodId });
      await onSuccess();
    } catch (err) {
      let message = err instanceof ApiError ? err.message : "Payment failed. Please try again.";
      if (err instanceof ApiError && err.status === 409) {
        message = "Vipps is already active/pending. Cancel Vipps first.";
      }
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="field">
        <label>Card details</label>
        <div
          style={{
            padding: "12px",
            border: "1px solid #d1d5db",
            borderRadius: "10px",
            background: "#fff",
          }}
        >
          <CardElement options={{ style: { base: { fontSize: "16px" } } }} />
        </div>
      </div>
      {error ? <div className="error">{error}</div> : null}
      <button className="button" type="submit" disabled={!stripe || submitting}>
        {submitting ? "Processing..." : "Add/Update Card"}
      </button>
    </form>
  );
};

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
};

const graceDays = 7;

const BillingPage = () => {
  const { companySlug } = useParams<{ companySlug?: string }>();
  const slug = companySlug || getCompanySlug() || undefined;
  const [status, setStatus] = useState<BillingStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState("BASIC");
  const [vippsPhone, setVippsPhone] = useState("");
  const [vippsError, setVippsError] = useState<string | null>(null);
  const [vippsBusy, setVippsBusy] = useState(false);
  const [vippsCharges, setVippsCharges] = useState<VippsCharge[]>([]);
  const [vippsChargesError, setVippsChargesError] = useState<string | null>(null);
  const [vippsChargesLoading, setVippsChargesLoading] = useState(false);
  const [vippsActionBusy, setVippsActionBusy] = useState(false);
  const [vippsTestBusy, setVippsTestBusy] = useState(false);
  const [vippsTestMessage, setVippsTestMessage] = useState<string | null>(null);
  const [stripePortalBusy, setStripePortalBusy] = useState(false);
  const [stripePortalError, setStripePortalError] = useState<string | null>(null);
  const [devError, setDevError] = useState<string | null>(null);
  const [devBusy, setDevBusy] = useState(false);

  const loadStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getBillingStatus(slug);
      setStatus(data);
      if (data.subscription?.plan) {
        setPlan(data.subscription.plan);
      }
      if (data.subscription?.vippsAgreementId) {
        setVippsChargesLoading(true);
        setVippsChargesError(null);
        try {
          const chargesRes = await getVippsCharges(slug);
          setVippsCharges(chargesRes.charges || []);
        } catch (err) {
          const message = err instanceof ApiError ? err.message : "Failed to load Vipps charges.";
          setVippsChargesError(message);
        } finally {
          setVippsChargesLoading(false);
        }
      } else {
        setVippsCharges([]);
      }
      const statusValue = data.subscription?.status;
      if (statusValue === "CANCELED") {
        window.dispatchEvent(
          new CustomEvent("subscription-inactive", { detail: { status: "CANCELED" } }),
        );
      } else if (statusValue === "ACTIVE" || statusValue === "TRIALING") {
        window.dispatchEvent(
          new CustomEvent("subscription-inactive", { detail: { status: null } }),
        );
      } else if (statusValue === "PAST_DUE") {
        const pastDueAt = data.subscription?.pastDueAt
          ? new Date(data.subscription.pastDueAt).getTime()
          : null;
        const expired = pastDueAt ? Date.now() >= pastDueAt + graceDays * 24 * 60 * 60 * 1000 : false;
        if (expired) {
          window.dispatchEvent(
            new CustomEvent("subscription-inactive", { detail: { status: "PAST_DUE" } }),
          );
        }
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to load billing status.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleVipps = async () => {
    setVippsBusy(true);
    setVippsError(null);
    try {
      const payload = {
        plan,
        phoneNumber: vippsPhone.trim() || undefined,
      };
      const res = await createVippsAgreement(slug, payload);
      window.location.href = res.vippsConfirmationUrl;
    } catch (err) {
      let message = err instanceof ApiError ? err.message : "Vipps setup failed.";
      if (err && typeof err === "object" && "data" in err) {
        const data = (err as { data?: { error?: string; missing?: string[]; provider?: string } }).data;
        if (data?.error) {
          if (data.error === "BILLING_PROVIDER_CONFLICT" && data.provider === "STRIPE") {
            message = "Stripe is already active. Cancel Stripe first or use Stripe portal.";
          } else {
            message = data.error;
            if (Array.isArray(data.missing) && data.missing.length > 0) {
              message = `${message} (missing ${data.missing.join(", ")})`;
            }
          }
        }
      } else if (err instanceof Error && err.message) {
        message = err.message;
      }
      setVippsError(message);
    } finally {
      setVippsBusy(false);
    }
  };

  const handleVippsSync = async () => {
    setVippsActionBusy(true);
    setVippsError(null);
    try {
      await syncVippsAgreement(slug);
      await loadStatus();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to sync Vipps status.";
      setVippsError(message);
    } finally {
      setVippsActionBusy(false);
    }
  };

  const handleVippsChangePlan = async () => {
    setVippsActionBusy(true);
    setVippsError(null);
    try {
      await changeVippsPlan(slug, { plan });
      await loadStatus();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to change Vipps plan.";
      setVippsError(message);
    } finally {
      setVippsActionBusy(false);
    }
  };

  const handleVippsCancel = async () => {
    setVippsActionBusy(true);
    setVippsError(null);
    try {
      await cancelVippsAgreement(slug);
      await loadStatus();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to cancel Vipps.";
      setVippsError(message);
    } finally {
      setVippsActionBusy(false);
    }
  };

  const handleVippsTestCharge = async () => {
    setVippsTestBusy(true);
    setVippsError(null);
    setVippsTestMessage(null);
    try {
      const res = await createVippsTestCharge(slug);
      setVippsTestMessage(`Test charge created for ${res.dueDate} (order ${res.orderId}).`);
      await loadStatus();
    } catch (err) {
      let message = err instanceof ApiError ? err.message : "Failed to create Vipps test charge.";
      if (err instanceof ApiError && err.status === 403) {
        message = "Test charge endpoint is disabled in production.";
      }
      setVippsError(message);
    } finally {
      setVippsTestBusy(false);
    }
  };
  const handleStripePortal = async () => {
    setStripePortalBusy(true);
    setStripePortalError(null);
    try {
      const res = await createStripePortalSession(slug);
      window.location.href = res.url;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Unable to open Stripe portal.";
      setStripePortalError(message);
    } finally {
      setStripePortalBusy(false);
    }
  };

  const handleDevAction = async (action: "reset-trial" | "activate" | "past-due" | "cancel") => {
    setDevBusy(true);
    setDevError(null);
    try {
      if (action === "reset-trial") {
        await devResetTrial(slug);
      } else if (action === "activate") {
        await devActivate(slug);
      } else if (action === "past-due") {
        await devPastDue(slug);
      } else {
        await devCancel(slug);
      }
      await loadStatus();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to update status.";
      setDevError(message);
    } finally {
      setDevBusy(false);
    }
  };

  const subscription = status?.subscription;
  const stripeReady = useMemo(() => Boolean(stripePromise), []);
  const vippsExists = Boolean(subscription?.vippsAgreementId);
  const vippsActiveOrPending =
    vippsExists && subscription?.vippsAgreementStatus !== "STOPPED";
  const statusMessage = (() => {
    if (!subscription?.status) return null;
    if (subscription.status === "TRIALING") {
      return `Trial ends on ${formatDate(subscription.trialEnd)}. Access is allowed during trial.`;
    }
    if (subscription.status === "ACTIVE") {
      return "Subscription active. Access allowed.";
    }
    if (subscription.status === "PAST_DUE") {
      if (!subscription.pastDueAt) {
        return "Payment failed. Grace period: 7 days.";
      }
      const pastDueAt = new Date(subscription.pastDueAt);
      const daysSince = Math.floor(
        (Date.now() - pastDueAt.getTime()) / (24 * 60 * 60 * 1000),
      );
      const daysLeft = Math.max(0, graceDays - daysSince);
      if (daysLeft === 0) {
        return "Payment failed. Grace ended. Access should be blocked.";
      }
      return `Payment failed. Grace period: 7 days. ${daysLeft} day(s) left.`;
    }
    if (subscription.status === "CANCELED") {
      return "Subscription canceled. Access blocked.";
    }
    return null;
  })();

  return (
    <div className="page">
      <div className="card" style={{ maxWidth: "640px" }}>
        <h1>Billing</h1>
        <p className="muted">Manage your subscription and payment methods.</p>

        {loading ? <p>Loading status...</p> : null}
        {error ? <div className="error">{error}</div> : null}

        {!loading && subscription ? (
          <div style={{ marginBottom: "16px" }}>
            <div className="row">
              <strong>Plan</strong>
              <span>{subscription.plan || "—"}</span>
            </div>
            <div className="row">
              <strong>Status</strong>
              <span>{subscription.status || "—"}</span>
            </div>
            <div className="row">
              <strong>Provider</strong>
              <span>{status?.billingProvider || "�"}</span>
            </div>
            {statusMessage ? (
              <div
                className={
                  subscription.status === "PAST_DUE" || subscription.status === "CANCELED"
                    ? "error"
                    : "muted"
                }
              >
                {statusMessage}
              </div>
            ) : null}
            {subscription.status === "TRIALING" && subscription.trialEnd ? (
              <div className="row">
                <strong>Trial ends</strong>
                <span>{formatDate(subscription.trialEnd)}</span>
              </div>
            ) : null}
            <div className="row">
              <strong>Past due at</strong>
              <span>{formatDate(subscription.pastDueAt)}</span>
            </div>
            <div className="row">
              <strong>Stripe subscription</strong>
              <span>{subscription.stripeSubscriptionId || "—"}</span>
            </div>
            <div className="row">
              <strong>Vipps agreement</strong>
              <span>{subscription.vippsAgreementId || "—"}</span>
            </div>
            <div className="row">
              <strong>Vipps status</strong>
              <span>{subscription.vippsAgreementStatus || "—"}</span>
            </div>
          </div>
        ) : null}

        <div className="field">
          <label>Plan</label>
          <select
            value={plan}
            onChange={(event) => setPlan(event.target.value)}
            style={{ padding: "10px 12px", borderRadius: "10px", border: "1px solid #d1d5db" }}
          >
            <option value="BASIC">Basic</option>
            <option value="MEDIUM">Medium</option>
            <option value="PRO">Pro</option>
          </select>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <h3 style={{ marginBottom: "8px" }}>Card</h3>
          {!stripeReady ? (
            <p className="muted">Stripe is not configured for this environment.</p>
          ) : (
            <>
              <Elements stripe={stripePromise}>
                <StripeCardSetupForm plan={plan} companySlug={slug} onSuccess={loadStatus} />
              </Elements>
              {stripePortalError ? <div className="error">{stripePortalError}</div> : null}
              <button
                className="button secondary"
                type="button"
                onClick={handleStripePortal}
                disabled={stripePortalBusy}
                style={{ marginTop: "10px" }}
              >
                {stripePortalBusy ? "Opening..." : "Manage in Stripe"}
              </button>
            </>
          )}
        </div>

        <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "16px" }}>
          <h3 style={{ marginBottom: "8px" }}>Vipps</h3>
          {vippsActiveOrPending ? (
            <div style={{ marginBottom: "12px" }}>
              <p className="muted">Vipps is connected.</p>
              <div className="row">
                <strong>Agreement ID</strong>
                <span>{subscription?.vippsAgreementId || "—"}</span>
              </div>
              <div className="row">
                <strong>Status</strong>
                <span>{subscription?.vippsAgreementStatus || "—"}</span>
              </div>
              {vippsError ? <div className="error">{vippsError}</div> : null}
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "10px" }}>
                <button
                  className="button secondary"
                  type="button"
                  onClick={handleVippsSync}
                  disabled={vippsActionBusy}
                >
                  Sync Vipps status
                </button>
                <button
                  className="button secondary"
                  type="button"
                  onClick={handleVippsChangePlan}
                  disabled={vippsActionBusy}
                >
                  Change Vipps plan
                </button>
                <button
                  className="button secondary"
                  type="button"
                  onClick={handleVippsCancel}
                  disabled={vippsActionBusy}
                >
                  Cancel Vipps
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="field">
                <label>Phone number (optional)</label>
                <input
                  value={vippsPhone}
                  onChange={(event) => setVippsPhone(event.target.value)}
                  placeholder="+47 999 99 999"
                />
              </div>
              {vippsError ? <div className="error">{vippsError}</div> : null}
              <button className="button" type="button" onClick={handleVipps} disabled={vippsBusy}>
                {vippsBusy ? "Redirecting..." : "Pay with Vipps"}
              </button>
            </>
          )}

          {vippsExists ? (
            <div style={{ marginTop: "16px" }}>
              <h4 style={{ marginBottom: "8px" }}>Recent charges</h4>
              {vippsChargesLoading ? <p className="muted">Loading charges...</p> : null}
              {vippsChargesError ? <div className="error">{vippsChargesError}</div> : null}
              {!vippsChargesLoading && vippsCharges.length === 0 ? (
                <p className="muted">No Vipps charges yet.</p>
              ) : null}
              {!vippsChargesLoading && vippsCharges.length > 0 ? (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: "left", padding: "6px 8px" }}>Due date</th>
                        <th style={{ textAlign: "left", padding: "6px 8px" }}>Amount</th>
                        <th style={{ textAlign: "left", padding: "6px 8px" }}>Status</th>
                        <th style={{ textAlign: "left", padding: "6px 8px" }}>Charge</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vippsCharges.map((charge) => (
                        <tr key={charge.id}>
                          <td style={{ padding: "6px 8px" }}>{formatDate(charge.dueDate)}</td>
                          <td style={{ padding: "6px 8px" }}>
                            {charge.amount} {charge.currency}
                          </td>
                          <td style={{ padding: "6px 8px" }}>{charge.status}</td>
                          <td style={{ padding: "6px 8px" }}>
                            {charge.chargeId || charge.externalId}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>


        {import.meta.env.MODE !== "production" && vippsActiveOrPending ? (
          <div style={{ borderTop: "1px dashed #e5e7eb", paddingTop: "16px", marginTop: "16px" }}>
            <h3 style={{ marginBottom: "8px" }}>Developer tools</h3>
            {vippsTestMessage ? <div className="muted">{vippsTestMessage}</div> : null}
            <button
              className="button secondary"
              type="button"
              onClick={handleVippsTestCharge}
              disabled={vippsTestBusy}
              style={{ marginTop: "8px" }}
            >
              {vippsTestBusy ? "Creating..." : "Create Vipps test charge (due in 2 days)"}
            </button>
          </div>
        ) : null}
        {import.meta.env.DEV ? (
          <div style={{ borderTop: "1px dashed #e5e7eb", paddingTop: "16px" }}>
            <h3 style={{ marginBottom: "8px" }}>DEV Tools</h3>
            {devError ? <div className="error">{devError}</div> : null}
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button
                className="button secondary"
                type="button"
                disabled={devBusy}
                onClick={() => handleDevAction("reset-trial")}
              >
                Reset trial
              </button>
              <button
                className="button secondary"
                type="button"
                disabled={devBusy}
                onClick={() => handleDevAction("activate")}
              >
                Activate
              </button>
              <button
                className="button secondary"
                type="button"
                disabled={devBusy}
                onClick={() => handleDevAction("past-due")}
              >
                Past due
              </button>
              <button
                className="button secondary"
                type="button"
                disabled={devBusy}
                onClick={() => handleDevAction("cancel")}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default BillingPage;







