# Database Security Evaluation - TransApp

**Date:** 2026-01-18  
**Project:** TransApp  
**Scope:** Database schema, configuration, access patterns, and data protection

---

## Executive Summary

The database security posture is **GOOD with some recommendations**. The codebase demonstrates solid fundamentals including:
- ✅ Use of Prisma ORM (prevents SQL injection)
- ✅ Multi-tenant isolation via `companyId`
- ✅ Password hashing with bcrypt
- ✅ JWT token-based authentication
- ✅ Role-based access control (RBAC)
- ✅ Environment variable protection for credentials

However, there are areas that require attention for production readiness.

---

## 1. STRENGTHS

### 1.1 SQL Injection Prevention ✅
**Status:** EXCELLENT
- **Evidence:** All database operations use Prisma ORM with parameterized queries
- **Examples:**
  - [vehicleRepository.js](vehicleRepository.js#L1-L50) uses `prisma.vehicle.findMany()` with safe where clauses
  - [defectRepository.js](defectRepository.js#L87-L95) uses `prisma.defect.create()` and `findFirst()`
- **Assessment:** No raw SQL queries found, eliminating SQL injection vulnerabilities

### 1.2 Multi-Tenant Data Isolation ✅
**Status:** EXCELLENT
- **Database Design:** [prisma/schema.prisma](prisma/schema.prisma) properly enforces company isolation
  - Every data model includes `companyId` foreign key
  - Composite unique constraints: `@@unique([companyId, regNumber])` (vehicles), `@@unique([companyId, email])` (users)
- **Query Pattern:** Repositories consistently filter by `companyId`
  ```javascript
  // vehicleRepository.js
  where: { companyId: Number(companyId), id: Number(id) }
  ```
- **Assessment:** Strong isolation prevents cross-tenant data leakage

### 1.3 Authentication & Authorization ✅
**Status:** GOOD
- **JWT Implementation:** [src/utils/jwt.js](src/utils/jwt.js) uses `jsonwebtoken` with secrets from environment
- **Password Security:** [src/utils/password.js](src/utils/password.js) uses `bcrypt` with configurable rounds
- **Rate Limiting:** [src/middleware/loginRateLimit.js](src/middleware/loginRateLimit.js) protects against brute force
  - IP-based limit: 10 attempts per 15 minutes
  - Identifier-based limit: 5 attempts per 15 minutes
- **Role-Based Access Control:** [src/middlewares/requireRole.js](src/middlewares/requireRole.js) validates user roles

### 1.4 Environment Configuration ✅
**Status:** EXCELLENT
- **[src/config/env.js](src/config/env.js)** implements comprehensive validation:
  - Required variables enforced: `PORT, DATABASE_URL, NODE_ENV, JWT_SECRET, JWT_EXPIRES_IN, BCRYPT_ROUNDS`
  - Database URL format validation (PostgreSQL only)
  - Port and bcrypt rounds must be valid numbers
  - Immutable config with `Object.freeze()`

### 1.5 Connection Pooling ✅
**Status:** GOOD
- **[src/config/prismaClient.js](src/config/prismaClient.js)** implements connection pooling
- Uses PrismaPg adapter with native PostgreSQL pool
- Global singleton pattern prevents connection exhaustion in development

### 1.6 Audit Trail & Data Protection ✅
**Status:** GOOD
- **Timestamp Tracking:** All models include `createdAt` and `updatedAt` (many with explicit `@db.Timestamptz`)
- **Defect Audit:** [prisma/schema.prisma](prisma/schema.prisma#L336-L350) tracks defect events:
  - `DefectEvent` model captures who did what and when
  - Admin note updates tracked with timestamp and user ID
- **Soft Deletes:** Document attachments use `purgedAt` timestamp for soft deletion

---

## 2. VULNERABILITIES & RISKS

### 2.1 🔴 CRITICAL: JWT Token Expiration May Be Too Long
**Severity:** MEDIUM  
**File:** [src/config/env.js](src/config/env.js#L32)

```javascript
jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1h",
```

**Issues:**
- Default of 1 hour is reasonable BUT could be extended if env var is misconfigured
- No JWT refresh token mechanism observed
- Long-lived tokens increase risk if token is compromised

**Recommendations:**
```javascript
// Validate JWT expiration is reasonable
const jwtExpire = process.env.JWT_EXPIRES_IN || "30m";
const VALID_EXPIRES = ["15m", "30m", "1h"];
if (!VALID_EXPIRES.includes(jwtExpire)) {
  throw new Error("JWT_EXPIRES_IN must be 15m, 30m, or 1h");
}
```

---

### 2.2 🟡 IMPORTANT: Insufficient Input Validation on findUnique Queries
**Severity:** MEDIUM  
**Files:** Multiple

**Evidence:**
- [authService.js](authService.js#L99-L107) uses `findUnique()` without sufficient validation:
  ```javascript
  const user = await prisma.user.findUnique({
    where: userLookup,  // userLookup is dynamically constructed
  });
  ```

**Issue:** While Prisma prevents SQL injection, insufficient validation of WHERE clause construction could lead to unexpected behavior:

**Recommendation:**
```javascript
// Add explicit validation before query
const userLookup = raw.includes("@")
  ? { email: normalizeEmail(raw) }
  : phoneLike
  ? { phone: normalizePhone(raw) }
  : { username: normalizeUsername(raw) };

// Validate exactly one key is present
const keys = Object.keys(userLookup);
if (keys.length !== 1) {
  throw new AppError(400, "Invalid lookup", "INVALID_LOOKUP");
}
```

---

### 2.3 🟡 IMPORTANT: Missing Field-Level Encryption for Sensitive Data
**Severity:** MEDIUM  
**Files:** [prisma/schema.prisma](prisma/schema.prisma)

**Issues:**
- Email addresses, phone numbers, and usernames stored in plain text in database
- Stripe customer IDs, Vipps agreement IDs stored unencrypted
- If database is compromised, sensitive identifiers are exposed
- PII (Personally Identifiable Information) is not encrypted at rest

**Current State:**
```sql
email              String?
phone              String?
username           String?
stripeCustomerId   String? @map("stripe_customer_id")
vippsAgreementId   String? @map("vipps_agreement_id")
```

**Recommendations:**
```javascript
// Option 1: Use field-level encryption (recommended for PII)
// Add to schema.prisma (if using Prisma's encryption features)
email   String? @db.Encrypted
phone   String? @db.Encrypted
```

OR (current approach):
```javascript
// Option 2: Application-level encryption for most sensitive fields
const crypto = require("crypto");

const encrypt = (text, key) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
};

// Store encrypted email for verification/lookup
stripeCustomerId  String? @map("stripe_customer_id") // Encrypt this
vippsAgreementId  String? @map("vipps_agreement_id")  // Encrypt this
```

---

### 2.4 🟡 IMPORTANT: No Database Audit Logging
**Severity:** MEDIUM  
**Files:** Database layer

**Issue:** 
- No logs of WHO modified sensitive data (UPDATE/DELETE on users, subscription, defects)
- Password changes not logged
- Admin note updates tracked in model but not in query-level logs
- Compliance/forensics gap for regulated operations

**Current Tracking:**
- `DefectEvent` table provides application-level audit for defects
- Missing: User modifications, subscription changes, bulk operations

**Recommendation:**
```sql
-- Create audit table
CREATE TABLE audit_log (
  id SERIAL PRIMARY KEY,
  table_name VARCHAR(100) NOT NULL,
  record_id VARCHAR(50) NOT NULL,
  action VARCHAR(20) NOT NULL, -- INSERT, UPDATE, DELETE
  company_id INT NOT NULL,
  user_id INT,
  old_values JSONB,
  new_values JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_company_time ON audit_log(company_id, timestamp DESC);
CREATE INDEX idx_audit_record ON audit_log(table_name, record_id);
```

---

### 2.5 🟡 IMPORTANT: Weak Rate Limiting on Password Reset
**Severity:** MEDIUM  
**Files:** [src/middleware/forgotPasswordRateLimit.js](src/middleware/forgotPasswordRateLimit.js)

**Issue:**
- Password reset endpoint may be rate limited but needs verification
- No mention of token expiration policy in schema review
- [PasswordResetToken](prisma/schema.prisma#L217) has `expiresAt` but no `maxUses` or similar

**Observations:**
```javascript
// PasswordResetToken has expiresAt but...
model PasswordResetToken {
  tokenHash String   @map("token_hash")
  expiresAt DateTime @map("expires_at")
  usedAt    DateTime? @map("used_at")  // Good - tracks single use
}
```

**Recommendations:**
- Verify rate limiting is active (check middleware registration in routes)
- Ensure reset tokens expire after 15-30 minutes
- Implement max attempts per email per hour

---

### 2.6 🟡 IMPORTANT: No Column-Level Access Control (CLAC)
**Severity:** LOW-MEDIUM  
**Files:** Database schema

**Issue:**
- All authenticated users can potentially read sensitive columns if permissions aren't enforced at app level
- No database-level column masking
- Depends entirely on API layer to filter responses

**Examples:**
```javascript
// adminNote is accessible - ensure proper filtering
defects Defect[] @relation("DefectsAdminNoteUpdatedByUser")

// All user fields returned if not explicitly selected
user: { select: { id, email, phone, username, ...all fields } }
```

**Recommendation:**
Verify all API endpoints explicitly SELECT only needed fields:
```javascript
// GOOD - explicit select
select: { id: true, name: true, regNumber: true }

// BAD - might return sensitive fields
// (no explicit select = returns all columns)
```

---

### 2.7 🟡 MEDIUM: PostgreSQL Version & Security Updates Unknown
**Severity:** LOW-MEDIUM  
**Files:** Database configuration

**Issue:**
- No `.pgVersion` or version specification in Prisma config
- Unsure if database runs latest security patches
- PostgreSQL security updates are critical (e.g., CVE-2024-xxxx)

**Recommendation:**
```json
{
  "prisma": {
    "seed": "node prisma/seed.js"
  },
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  }
}
```

Add to infrastructure/deployment docs:
```bash
# Enforce PostgreSQL version
PostgreSQL >= 15.x (recommended: 16.x)
```

---

### 2.8 🟠 LOW: Connection String Not Validated at Runtime
**Severity:** LOW  
**Files:** [src/config/prismaClient.js](src/config/prismaClient.js)

**Current:**
```javascript
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required...");
}
```

**Issue:** Throws generic error if missing - could leak environment details

**Recommendation:**
```javascript
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable not configured");
  // NOT: throw new Error(`DATABASE_URL missing: expected format postgresql://user:pass@host/db`);
}
```

---

### 2.9 🟠 LOW: Document File Storage Path Predictable
**Severity:** LOW  
**Files:** [src/controllers/documentController.js](src/controllers/documentController.js#L60-L62)

**Issue:**
```javascript
const relativePath = path.join("uploads", String(req.companyId), "documents", `${created.id}${ext}`);
```

- Document IDs are UUIDs but stored in predictable `uploads/companyId/documents/` path
- Traversal attacks could occur if path validation is weak
- No file type validation beyond MIME type (could be spoofed)

**Recommendation:**
```javascript
const ALLOWED_MIMES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "text/plain"
];

if (!ALLOWED_MIMES.includes(req.file.mimetype)) {
  throw new AppError(400, "Unsupported file type", "UNSUPPORTED_FILE_TYPE");
}

// Validate file signature (magic bytes)
const fileSignature = req.file.buffer.subarray(0, 4);
const isValidPdf = fileSignature.toString() === "<80,80,70,..>";  // %PDF

if (ext === ".pdf" && !isValidPdf) {
  throw new AppError(400, "File signature invalid", "INVALID_FILE");
}

// Use secure random path
const relativePath = path.join(
  "uploads",
  String(req.companyId),
  "documents",
  crypto.randomBytes(16).toString("hex"),
  `${created.id}${ext}`
);
```

---

## 3. COMPLIANCE & REGULATORY

### 3.1 GDPR Compliance Gaps
**Severity:** MEDIUM

- ✅ `createdAt` timestamps present
- ✅ User data scoped to company (data minimization)
- ❌ No explicit "right to be forgotten" implementation
- ❌ No data export functionality observed
- ❌ PII encryption at rest NOT implemented
- ❌ PII encryption in transit NOT verified (HTTPS configuration not reviewed)

**Recommendations:**
```javascript
// Implement GDPR deletion cascade
const deleteUserData = async (companyId, userId) => {
  await prisma.$transaction(async (tx) => {
    // Anonymize sensitive data first
    await tx.user.update({
      where: { id: userId, companyId },
      data: {
        email: `deleted-${userId}@internal.local`,
        phone: null,
        username: null,
        passwordHash: "DELETED",
      }
    });
    
    // Then handle related data
    await tx.defectComment.deleteMany({ where: { userId } });
    await tx.defectEvent.deleteMany({ where: { actorUserId: userId } });
    // ... continue for all user-related data
  });
};
```

---

### 3.2 Data Retention Policy
**Severity:** MEDIUM

**Missing Documentation:**
- How long are password reset tokens kept? (schema shows `usedAt` but no retention)
- How long are audit logs retained?
- Are soft-deleted documents (with `purgedAt`) ever hard-deleted?

**Recommendation:** Add to schema:
```prisma
// Track deletion retention
model DeletedRecord {
  id        String   @id @default(cuid())
  tableName String
  recordId  String
  deletedBy Int
  deletedAt DateTime @default(now())
  
  @@index([deletedAt])
  @@map("deleted_records")
}
```

---

## 4. RECOMMENDATIONS SUMMARY

### Priority 1: IMPLEMENT IMMEDIATELY
1. **Add database audit logging** - Track all sensitive data modifications
2. **Implement field-level encryption** - Encrypt email, phone, payment IDs at rest
3. **Add GDPR data export/deletion** - Support user data portability
4. **Validate JWT expiration** - Ensure it's not misconfigured to exceed 1 hour

### Priority 2: IMPLEMENT SOON
5. **File upload validation** - Verify file signatures (magic bytes), not just MIME type
6. **Document retention policy** - Define and implement soft/hard delete schedules
7. **Database version enforcement** - Require PostgreSQL 15+ with security patches
8. **Connection encryption** - Ensure DATABASE_URL uses `postgresql://` with SSL mode

### Priority 3: CONSIDER
9. **Database user least privilege** - Create separate DB users for app (read), migrations (admin)
10. **Secrets rotation** - Implement JWT_SECRET rotation every 90 days
11. **Query performance audit** - Ensure no N+1 queries that could be DoS vector
12. **Backup encryption** - Ensure database backups are encrypted at rest

---

## 5. TESTING RECOMMENDATIONS

### 5.1 Security Tests to Add
```bash
# Test SQL injection resistance
- POST /api/users with: {"username": "'; DROP TABLE users; --"}
✅ Should safely escape (Prisma handles this)

# Test multi-tenant isolation
- Create User A in Company 1
- Create User B in Company 2
- Login as User B, try to access Company 1 vehicles
✅ Should return 403 or empty result

# Test brute force protection
- POST /api/auth/login 15 times with wrong password
✅ Should rate limit after limit exceeded

# Test document path traversal
- Upload document, try to download with: `../../../etc/passwd`
✅ Should reject or return 404
```

### 5.2 Database Security Checks
```sql
-- Verify row-level security (if implemented)
SELECT COUNT(*) FROM vehicles WHERE company_id = 1;
SELECT COUNT(*) FROM vehicles WHERE company_id = 2;
-- Should match expected counts, not leak across companies

-- Check for unencrypted sensitive data
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('email', 'phone', 'password_hash');
-- Verify encryption at DB level if required

-- Check for orphaned records
SELECT * FROM users WHERE company_id NOT IN (SELECT id FROM companies);
-- Should be empty (referential integrity working)
```

---

## 6. CONCLUSION

**Overall Security Posture: B+ (GOOD)**

**Strengths:**
- Strong SQL injection prevention via Prisma ORM
- Solid multi-tenant isolation architecture
- Good authentication and rate limiting
- Proper password hashing

**Areas Requiring Attention:**
- Field-level encryption for PII/payment data
- Database audit logging infrastructure
- GDPR compliance implementation
- File upload security hardening

**Timeline Recommendation:**
- **2 weeks:** Implement Priority 1 items (audit logging, encryption, GDPR)
- **1 month:** Complete Priority 2 items (file validation, retention policy)
- **Ongoing:** Review Priority 3 items quarterly

---

**Reviewed by:** Security Assessment Tool  
**Next Review:** Quarterly or after major schema changes
