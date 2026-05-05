# TransApp Remediation Plan

Plan for fixing the issues identified in the security review and preparing the application for a stronger presentation as a work-in-progress B2B SaaS project.

## Code Context

The active application appears to be the `TransApp` folder. There is also a `checkFolder` copy, but this plan targets `TransApp`.

Confirmed findings in the codebase:

- `src/routes/billingRoutes.js` does not have a global role guard for the main billing endpoints.
- `src/routes/companyRoutes.js` mounts billing with `auth`, `companyContext`, `subscriptionContext`, and `billingLimiter`, but without `requireRole`.
- `src/middlewares/companyContext.js` sets `req.companyId` directly from the JWT and does not verify `:companySlug`.
- `src/middlewares/auth.js` trusts the JWT payload and does not revalidate the user in the database.
- `src/services/authService.js` uses `findUnique({ where: { email } })` and `findUnique({ where: userLookup })`, even though `email`, `phone`, and `username` are only unique together with `companyId`.
- `src/controllers/userController.js` allows `role: "PLATFORM_ADMIN"` when creating users, including requests made by regular `ADMIN` users.
- `src/routes/documentAdminRoutes.js` uses a Multer handler with an error-middleware signature on a normal route.
- `src/middlewares/requestLogger.js` logs `req.originalUrl || req.url`, including query strings.
- `frontend/src/auth/token.ts` stores the JWT in `localStorage`.
- `src/app.js` disables CSP in Helmet.

## Working Principles

1. Fix authorization bugs and tenant isolation first.
2. Every critical fix must include both a negative test and a positive test.
3. Avoid a major role model refactor in the first pass. First block privilege escalation; the `OWNER` / `SUPER_ADMIN` refactor stays in a separate phase.
4. Do not present the app as production-ready until at least P0 and P1 are complete.

## P0 - Critical Fixes

### 1. Protect billing routes globally

Status: done.

Risk: critical. A `DRIVER` can access or modify billing flows.

Target files:

- `src/routes/billingRoutes.js`
- `test/billing-stripe.test.js` or a new `test/billing-permissions.test.js`
- existing Vipps tests, if relevant

Implementation:

- Add `router.use(requireRole("ADMIN", "PLATFORM_ADMIN"));` immediately after router initialization in `billingRoutes.js`.
- Keep webhook endpoints outside this router if they are already separate.
- Check whether `GET /status` should also be admin-only. Recommendation: yes, because it exposes subscription IDs and provider state.

Tests:

- `DRIVER` receives `403` for `POST /stripe/subscribe`.
- `DRIVER` receives `403` for `POST /stripe/portal`.
- `DRIVER` receives `403` for `POST /vipps/agreements`.
- `DRIVER` receives `403` for `POST /vipps/change-plan`.
- `ADMIN` can access `GET /status`.

Acceptance criteria:

- No main tenant billing endpoint can be accessed by `DRIVER`.

### 2. Remove or fix generic login

Status: done.

Risk: critical. Generic login is incompatible with multi-tenant unique constraints.

Target files:

- `src/routes/authRoutes.js`
- `src/controllers/authController.js`
- `src/services/authService.js`
- `frontend/src/api/auth.ts`
- `frontend/src/pages/LoginPage.tsx`
- `test/auth-login.test.js`

Recommended implementation:

- Disable `POST /api/v1/auth/login` or return `410 GONE` / `400 TENANT_REQUIRED`.
- Keep tenant-aware login: `POST /api/v1/c/:companySlug/auth/login`.
- Remove or mark internal the `login()` function in `authService.js` that performs lookup without `companyId`.
- For owner registration, replace `findUnique({ email })` with an explicit product decision:
  - either allow the same email in different companies;
  - or check globally with `findFirst({ where: { email } })`, but then the database schema does not enforce global uniqueness.
- Recommendation for B2B SaaS: allow the same email in multiple companies and require `companySlug` for login.

Tests:

- Generic login is explicitly rejected.
- Login with `companySlug` works for a valid user.
- The same email can exist in two different companies and logs into the correct tenant.
- Login with the wrong slug is rejected.

Acceptance criteria:

- No login request searches for a user by email, phone, or username without `companyId`.

### 3. Block `ADMIN` to `PLATFORM_ADMIN` escalation

Status: done.

Risk: critical. Privilege escalation.

Target files:

- `src/controllers/userController.js`
- `test/users-create.test.js`

Implementation:

- In `createUser`, after body validation:
  - if `data.role === "PLATFORM_ADMIN"` and `req.user.role !== "PLATFORM_ADMIN"`, return `403`.
- Check existing update endpoints too, if role updates exist.
- Short term, keep `PLATFORM_ADMIN` as the company owner role for compatibility.

Tests:

- `ADMIN` cannot create `PLATFORM_ADMIN`.
- `PLATFORM_ADMIN` can create `PLATFORM_ADMIN`, if that is the intended behavior.
- `ADMIN` can create `ADMIN`.
- `ADMIN` can create `DRIVER`.

Acceptance criteria:

- A company admin cannot create or modify users with a higher role.

### 4. Revalidate the user in auth middleware

Status: done.

Risk: critical. Old tokens keep access after deactivation or role changes.

Target files:

- `src/middlewares/auth.js`
- `src/utils/jwt.js`
- `prisma/schema.prisma`
- new Prisma migration for `tokenVersion`
- `src/services/userService.js`
- `src/services/authService.js`
- `test/auth-me.test.js`
- `test/user-active.test.js`
- new test for role downgrade/token revocation

Two-step implementation:

Step 1, without migration:

- Make `auth` middleware async.
- After `verifyToken`, look up the user by `id`, `companyId`, and `isActive: true`.
- Select the current role from the database.
- Set `req.user.role` from the database, not from the JWT payload.

Step 2, with revocation:

- Add `tokenVersion Int @default(0)` to `User`.
- Include `tokenVersion` in the JWT on login.
- Compare the payload value with the database value.
- Increment `tokenVersion` when changing password, disabling a user, or making sensitive role changes.

Tests:

- A token for a disabled user receives `401` or `403`.
- After a role change, the request uses the current database role.
- After a password change, the old token is invalidated if step 2 is implemented.

Acceptance criteria:

- Authorization no longer relies only on the role stored in the JWT.

### 5. Verify `companySlug` against the authenticated tenant

Status: done.

Risk: high. The URL can point to one company while the operation runs under another.

Target files:

- `src/middlewares/companyContext.js`
- `src/routes/companyRoutes.js`
- `test/tenant-isolation.test.js`
- new `test/company-context.test.js`, if current coverage is not enough

Implementation:

- In `companyContext`, read `req.params.companySlug`.
- Look up the company by slug.
- If it does not exist, return `404 COMPANY_NOT_FOUND`.
- If `company.id !== req.user.companyId`, return `403 COMPANY_CONTEXT_MISMATCH`.
- Set `req.companyId`, `req.companySlug`, and optionally `req.company`.

Tests:

- A user from company A cannot access `/c/company-b/...`.
- A user from company A can access `/c/company-a/...`.
- A missing slug returns a controlled error.

Acceptance criteria:

- All authenticated tenant-aware routes have URL context consistent with JWT/database context.

### 6. Fix document upload routing

Status: done.

Risk: high. A valid upload may not reach the controller.

Target files:

- `src/routes/documentAdminRoutes.js`
- document admin tests

Implementation:

- Replace the current route with an explicit wrapper:

```js
router.post("/", (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ error: { code: "UPLOAD_FILE_TOO_LARGE", message: "File too large" } });
      }
      if (err.code === "UPLOAD_FILE_TYPE_NOT_ALLOWED") {
        return res.status(400).json({ error: { code: "UPLOAD_FILE_TYPE_NOT_ALLOWED", message: "File type not allowed" } });
      }
      return next(err);
    }
    return uploadDocument(req, res, next);
  });
});
```

Tests:

- `ADMIN` can upload a valid document.
- `DRIVER` cannot upload an admin document.
- Upload without a file returns `400`.
- Invalid MIME returns `400`.
- A file that is too large returns `400` or `413`, based on the project decision.

Acceptance criteria:

- A valid upload reliably reaches `uploadDocument`.

### 7. Redact sensitive query strings in logs

Status: done.

Risk: high. Reset tokens can end up in application logs.

Target files:

- `src/middlewares/requestLogger.js`
- new request logging test, if logger mocking is available
- `src/controllers/passwordResetController.js`
- `frontend/src/pages/ResetPasswordPage.tsx`
- `frontend/src/api/auth.ts`

Minimum implementation:

- Add `sanitizeUrl()` in `requestLogger`.
- Redact `token`, `password`, `secret`, `clientSecret`, `code`, and `refreshToken`.
- Log the sanitized URL instead of the raw `originalUrl`.

Recommended follow-up:

- Change token validation from `GET /reset-password/validate?token=...` to `POST /reset-password/validate` with the token in the body.

Tests:

- A request with `?token=abc` is logged as `?token=[REDACTED]`.
- A request without sensitive parameters remains readable.

Acceptance criteria:

- No reset token or secret appears in logs through the URL.

## P1 - Important Hardening

### 8. Use a consistent password policy

Status: done.

Risk: medium-high.

Target files:

- `src/controllers/userController.js`
- `src/services/authService.js`
- `src/utils/password.js`
- `src/controllers/passwordResetController.js`
- user/password/reset tests

Implementation:

- Centralize the password rule in a helper.
- Set a minimum of `8` characters for all roles.
- Production recommendation: `12` minimum, but `8` is acceptable as an MVP step.
- Remove the `6` character driver exception or document it as a temporary limitation.

Tests:

- Driver password below the limit is rejected.
- Admin password below the limit is rejected.
- Password reset follows the same policy.

### 9. Harden file upload security

Status: done.

Risk: medium-high.

Target files:

- `src/routes/documentAdminRoutes.js`
- `src/controllers/documentController.js`
- `src/controllers/defectAttachmentController.js`
- optional new helper `src/utils/fileValidation.js`

Implementation:

- Add magic byte validation for PDF, PNG, JPG, and TXT.
- Verify that the extension is consistent with the MIME type.
- Normalize/sanitize the original filename.
- Keep a random storage key.
- Serve downloads with `Content-Disposition: attachment`.

Tests:

- A file with spoofed MIME is rejected.
- An incompatible extension is rejected or normalized.
- Document downloads require auth and company context.

### 10. Reduce public company endpoint exposure

Status: done.

Risk: medium.

Target files:

- `src/controllers/companyController.js`
- `test/public-register.test.js` or a new public company test

Implementation:

- Return only the data required by the login/public UI:
  - `name`
  - `slug`
  - `defaultLanguage`
  - logo/theme, if available
- Do not expose `id`, `plan`, subscription state, or internal fields.

Tests:

- The public response does not contain `id` or `plan`.
- The login page still receives the data it needs.

### 11. Use timing-safe Vipps signature comparison

Status: done.

Risk: medium.

Target files:

- `src/routes/webhookRoutes.js`
- `src/lib/vippsClient.js`, if verification happens there
- `test/webhooks-vipps.test.js`

Implementation:

- Use `crypto.timingSafeEqual` for signature/secret comparisons.
- Normalize buffers to equal length before comparison.

Tests:

- A valid signature is accepted.
- An invalid signature is rejected.

### 12. Add production CSP and security headers

Status: done.

Risk: medium.

Target files:

- `src/app.js`
- hosting/reverse proxy config, if available
- deployment documentation

Implementation:

- Keep CSP more permissive in development if Vite needs it.
- In production, enable CSP with explicit directives for the frontend/API.
- Add or verify:
  - `Strict-Transport-Security`
  - `X-Content-Type-Options`
  - `Referrer-Policy`
  - `Permissions-Policy`
  - `frame-ancestors`

Tests:

- Integration test for expected headers in production mode.

### 13. Make rate limiting production-ready

Status: done.

Risk: medium.

Target files:

- `src/middleware/rateLimiterGeneral.js`
- `src/middleware/loginRateLimit.js`
- `src/middleware/registerRateLimit.js`
- `src/middleware/forgotPasswordRateLimit.js`
- `src/app.js`

Implementation:

- Replace in-memory `Map` storage with Redis for production.
- Use `req.ip` after `app.set("trust proxy", 1)` only when the deployment is behind a trusted proxy.
- Do not manually parse `X-Forwarded-For`.
- Rate limit by relevant combinations: IP, companySlug, identifier/email, userId.

Tests:

- The limit applies per IP/identifier.
- Header spoofing does not change the key when trust proxy is not enabled.

## P2 - Frontend Auth and Production Readiness

### 14. Migrate from localStorage to HttpOnly cookies

Status: done. Cookie auth now uses a double-submit CSRF token for mutating requests.

Risk: medium-high, with broader frontend/API impact.

Target files:

- `frontend/src/auth/token.ts`
- `frontend/src/api/http.ts`
- `frontend/src/auth/AuthContext.tsx`
- `frontend/src/api/csrf.ts`
- `src/controllers/authController.js`
- `src/services/authService.js`
- `src/app.js`
- `src/middlewares/csrfProtection.js`
- `src/utils/csrfToken.js`

Recommended implementation:

- Backend sets an `HttpOnly`, `Secure`, `SameSite=Lax` or `SameSite=Strict` cookie.
- Frontend uses `credentials: "include"`.
- Add a logout endpoint that clears the cookie.
- Add CSRF protection for mutating requests if auth becomes cookie-based.

Implemented CSRF behavior:

- Login sets an `HttpOnly` session cookie and a separate readable CSRF cookie.
- Cookie-authenticated `POST`, `PUT`, `PATCH`, and `DELETE` requests must send `X-CSRF-Token`.
- Bearer-token API clients remain compatible and do not require CSRF.
- Logout clears both the session cookie and the CSRF cookie.

Temporary alternative:

- Keep Bearer tokens, but document the MVP limitation.
- Shorten JWT lifetime.
- Add strict CSP and revocation through `tokenVersion`.

Tests:

- Login sets the cookie.
- `me` works without a token in localStorage.
- Logout invalidates the session.
- Mutating requests without valid CSRF are rejected.

### 15. Clarify the role model

Risk: medium, but the refactor is broad.

Problem:

- `PLATFORM_ADMIN` appears to be used as a company owner role, not only as a global platform admin.

Proposed model:

- `OWNER`: primary company owner/admin.
- `ADMIN`: operational company admin.
- `DRIVER`: driver.
- `SUPER_ADMIN`: internal platform admin, without `companyId` or with separate rules.

Implementation:

- Add a new enum or controlled role migration.
- Map existing `PLATFORM_ADMIN` users to `OWNER`.
- Introduce clear `SUPER_ADMIN` rules.
- Update tests, UI labels, and documentation.

Acceptance criteria:

- Roles clearly express the difference between tenant owner and global platform admin.

### 16. Use production-grade file storage

Risk: medium.

Implementation:

- Move production files from local filesystem storage to S3/R2/GCS.
- Use a private bucket.
- Serve downloads through an auth proxy or short-lived signed URLs.
- Add lifecycle policies, backup, and encryption at rest.
- Add malware scanning/quarantine for sensitive documents.

## P3 - CI/CD, Quality, and Documentation

### 17. Add GitHub Actions CI

Target files:

- `.github/workflows/ci.yml`

Minimum pipeline:

- `npm ci`
- `npm run build`
- `npm test`
- `npm audit --audit-level=high`

Recommended pipeline:

- backend install/test
- frontend install/build
- secret scan
- dependency review
- CodeQL/SAST
- Docker/container scan, if containerization is added

Acceptance criteria:

- Every PR or push runs tests and build automatically.

### 18. Enable stricter TypeScript gradually on the frontend

Target files:

- `frontend/tsconfig.json`
- affected frontend source files

Implementation:

- Start with:
  - `noImplicitAny: true`
  - `strictNullChecks: true`
- After fixing errors, enable `strict: true`.

Acceptance criteria:

- The frontend build passes with stricter TypeScript rules.

### 19. Update README and security docs

Target files:

- `README.md`
- `SECURITY_EVALUATION.md`
- optional new `docs/security-hardening.md`

Implementation:

- Position the app as a work-in-progress B2B SaaS.
- Document what has been fixed and what remains an MVP limitation.
- Do not use claims like "production-ready secure SaaS" until P0/P1 are complete.

## Recommended Execution Order

1. Billing role guard + tests.
2. Block `ADMIN` to `PLATFORM_ADMIN` escalation + tests.
3. `companySlug` mismatch guard + tests.
4. User revalidation in `auth` middleware + tests.
5. Generic login removal / tenant-aware auth + tests.
6. Document upload route fix + tests.
7. Sensitive query string redaction in logs + tests.
8. Consistent password policy.
9. File upload hardening.
10. Minimized public company endpoint.
11. Vipps timing-safe comparison.
12. CSP/security headers.
13. Redis/trust proxy rate limiting.
14. HttpOnly cookie auth or documented localStorage limitation.
15. CI/CD.
16. Gradual TypeScript strict mode.
17. `OWNER` / `SUPER_ADMIN` role refactor.
18. Production file storage.
19. README/security docs update.

## P0 Definition of Done

P0 is complete only when:

- All P0 changes have automated tests.
- `npm test` passes.
- `npm run build` passes.
- There is no generic login that searches for users without a tenant.
- `DRIVER` cannot access billing.
- `ADMIN` cannot create `PLATFORM_ADMIN`.
- Disabled or downgraded users do not retain access through old JWTs.
- The URL slug is verified against the authenticated company.
- Valid document upload works.
- Query string tokens do not appear in logs.

## Recommended Positioning Until the Plan Is Complete

Recommended text:

> Work-in-progress B2B SaaS for transport companies, with multi-tenancy, admin/driver roles, vehicle management, checklists, defect reporting, timesheets, documents, and billing integration. The project includes validation, tests, rate limiting, and progressive security hardening, but it is not production-ready yet.
