import { http } from "./http";
import { addCsrfHeader } from "./csrf";
import { tenantPath } from "../utils/tenantPath";

export type BillingSubscription = {
  plan?: string;
  status?: string;
  trialStart?: string | null;
  trialEnd?: string | null;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
  canceledAt?: string | null;
  pastDueAt?: string | null;
  vippsAgreementStatus?: string | null;
  vippsAgreementId?: string | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
};

export type BillingStatusResponse = {
  companyId?: number;
  billingProvider?: "STRIPE" | "VIPPS" | null;
  subscription: BillingSubscription;
};

export type StripeSetupIntentResponse = {
  clientSecret: string;
};

export type StripeSubscribeResponse = {
  subscriptionId: string;
  status: string;
  updated?: boolean;
};

export type StripePortalResponse = {
  url: string;
};

export type VippsAgreementResponse = {
  agreementId: string;
  vippsConfirmationUrl: string;
};

export type VippsCharge = {
  id: number;
  agreementId: string;
  chargeId: string | null;
  externalId: string;
  dueDate: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type VippsChargesResponse = {
  charges: VippsCharge[];
};

export type VippsChangePlanResponse = {
  ok: true;
  plan: string;
};

export type VippsTestChargeResponse = {
  ok: true;
  orderId: string;
  dueDate: string;
};

export type VippsSyncResponse = {
  vippsAgreementStatus: string | null;
  subscriptionStatus: string;
  isVippsActive: boolean;
};

const billingPath = (companySlug: string | undefined, path: string) =>
  `/api/v1${tenantPath(companySlug, `/billing/${path}`)}`;

export const getBillingStatus = (companySlug: string | undefined) =>
  http<BillingStatusResponse>(billingPath(companySlug, "status"));

export const createStripeSetupIntent = (companySlug: string | undefined) =>
  http<StripeSetupIntentResponse>(billingPath(companySlug, "stripe/setup-intent"), {
    method: "POST",
  });

export const subscribeStripe = (
  companySlug: string | undefined,
  payload: { plan: string; paymentMethodId?: string },
) =>
  http<StripeSubscribeResponse>(billingPath(companySlug, "stripe/subscribe"), {
    method: "POST",
    body: payload,
  });

export const createStripePortalSession = (companySlug: string | undefined) =>
  http<StripePortalResponse>(billingPath(companySlug, "stripe/portal"), {
    method: "POST",
  });

export const createVippsAgreement = (
  companySlug: string | undefined,
  payload: { plan: string; phoneNumber?: string },
) => {
  const path = billingPath(companySlug, "vipps/agreements");
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  addCsrfHeader(headers, "POST");

  return fetch(path, {
    method: "POST",
    cache: "no-store",
    credentials: "include",
    headers,
    body: JSON.stringify(payload),
  }).then(async (res) => {
    const contentType = res.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");
    let data: unknown = undefined;
    if (isJson) {
      try {
        data = await res.json();
      } catch {
        data = undefined;
      }
    }

    if (!res.ok) {
      const message =
        typeof (data as { error?: unknown })?.error === "string"
          ? (data as { error: string }).error
          : `HTTP_${res.status}`;
      const error = new Error(message) as Error & { data?: unknown };
      error.data = data;
      throw error;
    }

    return data as VippsAgreementResponse;
  });
};

export const syncVippsAgreement = (companySlug: string | undefined) =>
  http<VippsSyncResponse>(billingPath(companySlug, "vipps/sync"), { method: "POST" });

export const getVippsCharges = (companySlug: string | undefined) =>
  http<VippsChargesResponse>(billingPath(companySlug, "vipps/charges"));

export const changeVippsPlan = (
  companySlug: string | undefined,
  payload: { plan: string },
) =>
  http<VippsChangePlanResponse>(billingPath(companySlug, "vipps/change-plan"), {
    method: "POST",
    body: payload,
  });

export const cancelVippsAgreement = (companySlug: string | undefined) =>
  http<{ ok: true }>(billingPath(companySlug, "vipps/cancel"), { method: "POST" });

export const createVippsTestCharge = (companySlug: string | undefined) =>
  http<VippsTestChargeResponse>(billingPath(companySlug, "vipps/test-create-charge"), {
    method: "POST",
  });

const devPath = (companySlug: string | undefined, action: string) =>
  billingPath(companySlug, `dev/${action}`);

const devPost = async (path: string) => {
  const res = await fetch(path, {
    method: "POST",
    cache: "no-store",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...addCsrfHeader({}, "POST"),
    },
  });

  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const data = isJson ? await res.json() : undefined;

  if (!res.ok) {
    const message =
      typeof (data as { error?: unknown })?.error === "string"
        ? (data as { error: string }).error
        : `HTTP_${res.status}`;
    throw new Error(message);
  }

  return data as BillingStatusResponse;
};

export const devResetTrial = (companySlug: string | undefined) =>
  devPost(devPath(companySlug, "reset-trial"));

export const devActivate = (companySlug: string | undefined) =>
  devPost(devPath(companySlug, "activate"));

export const devPastDue = (companySlug: string | undefined) =>
  devPost(devPath(companySlug, "past-due"));

export const devCancel = (companySlug: string | undefined) =>
  devPost(devPath(companySlug, "cancel"));
