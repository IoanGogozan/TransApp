let cachedToken = null;

const getBaseUrl = () => {
  if (process.env.VIPPS_BASE_URL) return process.env.VIPPS_BASE_URL;
  return process.env.VIPPS_ENV === "production"
    ? "https://api.vipps.no"
    : "https://apitest.vipps.no";
};

const buildVippsHeaders = () => {
  const headers = {
    "Ocp-Apim-Subscription-Key": process.env.VIPPS_SUBSCRIPTION_KEY,
    "Merchant-Serial-Number": process.env.VIPPS_MSN,
  };

  if (process.env.VIPPS_SYSTEM_NAME) {
    headers["Vipps-System-Name"] = process.env.VIPPS_SYSTEM_NAME;
  }
  if (process.env.VIPPS_SYSTEM_VERSION) {
    headers["Vipps-System-Version"] = process.env.VIPPS_SYSTEM_VERSION;
  }
  if (process.env.VIPPS_PLUGIN_NAME) {
    headers["Vipps-System-Plugin-Name"] = process.env.VIPPS_PLUGIN_NAME;
  }
  if (process.env.VIPPS_PLUGIN_VERSION) {
    headers["Vipps-System-Plugin-Version"] = process.env.VIPPS_PLUGIN_VERSION;
  }

  return headers;
};

const requireVippsEnv = () => {
  if (!process.env.VIPPS_CLIENT_ID || !process.env.VIPPS_CLIENT_SECRET) {
    throw new Error("VIPPS_CLIENT_ID and VIPPS_CLIENT_SECRET are required");
  }
  if (!process.env.VIPPS_SUBSCRIPTION_KEY || !process.env.VIPPS_MSN) {
    throw new Error("VIPPS_SUBSCRIPTION_KEY and VIPPS_MSN are required");
  }
};

const getAccessToken = async () => {
  if (cachedToken && cachedToken.expiresAtMs - Date.now() > 60_000) {
    return cachedToken.token;
  }

  requireVippsEnv();

  const baseUrl = getBaseUrl();
  const response = await fetch(`${baseUrl}/accesstoken/get`, {
    method: "POST",
    headers: {
      client_id: process.env.VIPPS_CLIENT_ID,
      client_secret: process.env.VIPPS_CLIENT_SECRET,
      "Content-Type": "application/json",
      ...buildVippsHeaders(),
    },
    body: "",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Vipps token request failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  const expiresInMs = Number(data.expires_in || 0) * 1000;
  cachedToken = {
    token: data.access_token,
    expiresAtMs: Date.now() + expiresInMs,
  };

  return cachedToken.token;
};

const vippsRequest = async (path, { method = "GET", headers, body, idempotencyKey } = {}) => {
  const token = await getAccessToken();
  const baseUrl = getBaseUrl();
  const requestHeaders = {
    Authorization: `Bearer ${token}`,
    ...buildVippsHeaders(),
    ...headers,
  };

  if (idempotencyKey) {
    requestHeaders["Idempotency-Key"] = idempotencyKey;
  }

  if (body !== undefined) {
    requestHeaders["Content-Type"] = requestHeaders["Content-Type"] || "application/json";
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: requestHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw Object.assign(
      new Error(`Vipps API ${response.status} ${method} ${path}: ${text.slice(0, 500)}`),
      { status: response.status, body: text },
    );
  }

  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await response.json() : await response.text();

  return payload;
};

const stopVippsAgreement = async (agreementId) => {
  if (!agreementId) {
    throw new Error("Vipps agreementId is required");
  }
  return vippsRequest(`/recurring/v3/agreements/${agreementId}/stop`, { method: "POST" });
};

module.exports = { getAccessToken, vippsRequest, stopVippsAgreement };
