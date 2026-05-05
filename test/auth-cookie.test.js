const request = require("supertest");
const app = require("../src/app");
const { AUTH_COOKIE_NAME } = require("../src/utils/authCookie");
const { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } = require("../src/utils/csrfToken");
const { createCompany, createUser } = require("./helpers/testData");

const getCookieFromSetCookie = (setCookie, name) =>
  (setCookie || []).find((cookie) => cookie.startsWith(`${name}=`));

const getCookieValueFromSetCookie = (setCookie, name) => {
  const cookie = getCookieFromSetCookie(setCookie, name);
  if (!cookie) return null;
  const firstPart = cookie.split(";")[0];
  return decodeURIComponent(firstPart.slice(name.length + 1));
};

describe("Auth HttpOnly cookie", () => {
  it("sets an HttpOnly session cookie on login and accepts cookie auth", async () => {
    const company = await createCompany({ name: "Cookie Auth Co" });
    const password = "Password123!";
    const user = await createUser({
      companyId: company.id,
      email: "cookie.auth@example.com",
      passwordPlain: password,
    });

    const agent = request.agent(app);
    const loginRes = await agent
      .post(`/api/v1/c/${company.slug}/auth/login`)
      .send({ identifier: user.email, password });

    expect(loginRes.status).toBe(200);
    const setCookie = loginRes.headers["set-cookie"] || [];
    const authCookie = getCookieFromSetCookie(setCookie, AUTH_COOKIE_NAME);
    const csrfCookie = getCookieFromSetCookie(setCookie, CSRF_COOKIE_NAME);
    expect(authCookie).toBeDefined();
    expect(authCookie).toContain("HttpOnly");
    expect(authCookie).toContain("SameSite=Lax");
    expect(csrfCookie).toBeDefined();
    expect(csrfCookie).not.toContain("HttpOnly");
    expect(csrfCookie).toContain("SameSite=Lax");

    const meRes = await agent.get("/api/v1/me");

    expect(meRes.status).toBe(200);
    expect(meRes.body.user.email).toBe(user.email);
  });

  it("clears the session cookie on logout", async () => {
    const company = await createCompany({ name: "Cookie Logout Co" });
    const password = "Password123!";
    const user = await createUser({
      companyId: company.id,
      email: "cookie.logout@example.com",
      passwordPlain: password,
    });

    const agent = request.agent(app);
    const loginRes = await agent
      .post(`/api/v1/c/${company.slug}/auth/login`)
      .send({ identifier: user.email, password })
      .expect(200);

    const csrfToken = getCookieValueFromSetCookie(loginRes.headers["set-cookie"], CSRF_COOKIE_NAME);

    const logoutRes = await agent
      .post("/api/v1/auth/logout")
      .set(CSRF_HEADER_NAME, csrfToken)
      .expect(200);
    const setCookie = logoutRes.headers["set-cookie"] || [];
    const clearedCookie = getCookieFromSetCookie(setCookie, AUTH_COOKIE_NAME);
    const clearedCsrfCookie = getCookieFromSetCookie(setCookie, CSRF_COOKIE_NAME);
    expect(clearedCookie).toBeDefined();
    expect(clearedCookie).toContain("Expires=Thu, 01 Jan 1970");
    expect(clearedCsrfCookie).toBeDefined();
    expect(clearedCsrfCookie).toContain("Expires=Thu, 01 Jan 1970");

    const meRes = await agent.get("/api/v1/me");
    expect(meRes.status).toBe(401);
    expect(meRes.body.error.code).toBe("AUTH_MISSING_TOKEN");
  });

  it("requires CSRF header for cookie-authenticated mutating requests", async () => {
    const company = await createCompany({ name: "Cookie CSRF Co" });
    const password = "Password123!";
    const user = await createUser({
      companyId: company.id,
      email: "cookie.csrf@example.com",
      passwordPlain: password,
    });

    const agent = request.agent(app);
    const loginRes = await agent
      .post(`/api/v1/c/${company.slug}/auth/login`)
      .send({ identifier: user.email, password })
      .expect(200);

    const blockedRes = await agent
      .patch("/api/v1/me/password")
      .send({ password: "NewPassword123!" });

    expect(blockedRes.status).toBe(403);
    expect(blockedRes.body.error.code).toBe("CSRF_INVALID_TOKEN");

    const csrfToken = getCookieValueFromSetCookie(loginRes.headers["set-cookie"], CSRF_COOKIE_NAME);
    const allowedRes = await agent
      .patch("/api/v1/me/password")
      .set(CSRF_HEADER_NAME, csrfToken)
      .send({ password: "NewPassword123!" });

    expect(allowedRes.status).toBe(200);
  });

  it("does not require CSRF header for Bearer authenticated API clients", async () => {
    const company = await createCompany({ name: "Bearer CSRF Co" });
    const password = "Password123!";
    const user = await createUser({
      companyId: company.id,
      email: "bearer.csrf@example.com",
      passwordPlain: password,
    });

    const loginRes = await request(app)
      .post(`/api/v1/c/${company.slug}/auth/login`)
      .send({ identifier: user.email, password })
      .expect(200);

    const res = await request(app)
      .patch("/api/v1/me/password")
      .set("Authorization", `Bearer ${loginRes.body.token}`)
      .send({ password: "NewPassword123!" });

    expect(res.status).toBe(200);
  });

  it("requires CSRF header before clearing an existing cookie session", async () => {
    const company = await createCompany({ name: "Logout CSRF Co" });
    const password = "Password123!";
    const user = await createUser({
      companyId: company.id,
      email: "logout.csrf@example.com",
      passwordPlain: password,
    });

    const agent = request.agent(app);
    const loginRes = await agent
      .post(`/api/v1/c/${company.slug}/auth/login`)
      .send({ identifier: user.email, password })
      .expect(200);

    const blockedLogout = await agent.post("/api/v1/auth/logout");
    expect(blockedLogout.status).toBe(403);
    expect(blockedLogout.body.error.code).toBe("CSRF_INVALID_TOKEN");

    const csrfToken = getCookieValueFromSetCookie(loginRes.headers["set-cookie"], CSRF_COOKIE_NAME);
    await agent.post("/api/v1/auth/logout").set(CSRF_HEADER_NAME, csrfToken).expect(200);
  });
});
