# Dashboard API Security

This document outlines the security measures implemented in the TG-Lobby-Bot Dashboard API.

## Table of Contents

1. [Authentication & Authorization](#authentication--authorization)
2. [Brute Force Protection](#brute-force-protection)
3. [Session Management](#session-management)
4. [Audit Logging](#audit-logging)
5. [CSRF Protection](#csrf-protection)
6. [Rate Limiting](#rate-limiting)
7. [Security Headers](#security-headers)
8. [Input Validation](#input-validation)
9. [Best Practices](#best-practices)

---

## Authentication & Authorization

### Telegram OAuth

- **Primary authentication method**: Telegram Login Widget
- **Verification**: HMAC-SHA256 signature validation using bot token
- **Time-based security**: Auth data expires after 24 hours
- **Required fields**: `id`, `first_name`, `auth_date`, `hash`

### JWT Tokens

**Access Token:**
- **Purpose**: API authentication
- **Lifetime**: 15 minutes
- **Storage**: Client-side (localStorage)
- **Format**: `Authorization: Bearer <token>`

**Refresh Token:**
- **Purpose**: Access token renewal
- **Lifetime**: 7 days
- **Storage**: Client-side (localStorage)
- **One-time use**: Generates new access token

**Token Security:**
- Tokens hashed with SHA256 before database storage
- Tokens include user ID, role, and permissions
- Signed with strong secrets (32+ characters)
- Algorithm: HS256

### Role-Based Access Control (RBAC)

**Dashboard Access Roles:**
- ✅ **admin**: Full access to all features
- ✅ **mod**: Limited access (view stats, manage users, handle reports)
- ❌ **whitelist**: No dashboard access
- ❌ **null** (regular user): No dashboard access

**Permission Matrix:**
- 40+ granular permissions
- Organized by category (dashboard, stats, users, settings, content, moderation)
- Middleware enforces permissions on every protected route

---

## Brute Force Protection

### Progressive Delay System

**Failure Thresholds:**
1. **3 attempts** → 1 minute block
2. **5 attempts** → 5 minutes block
3. **7 attempts** → 15 minutes block
4. **10+ attempts** → 1 hour block

### Dual-Layer Protection

**IP-Based Tracking:**
- Tracks failed attempts by source IP address
- Prevents distributed attacks from single location
- Resets on successful login

**User-Based Tracking:**
- Tracks failed attempts by Telegram user ID
- Protects individual accounts from targeted attacks
- Prevents credential stuffing

### Implementation

**Database Model:** `LoginAttempt`
```javascript
{
  identifier: String,    // IP or user ID
  type: "ip" | "user",
  attempts: Number,
  lastAttempt: Date,
  blockedUntil: Date
}
```

**TTL Index:** Automatically deletes records after 24 hours of inactivity

**Error Messages:**
- Clear feedback on block duration
- User-friendly remaining time display
- Distinguishes between IP and user blocks

---

## Session Management

### Session Storage

**Database Model:** `Session`
```javascript
{
  userId: String,
  accessTokenHash: String,
  refreshTokenHash: String,
  ipAddress: String,
  userAgent: String,
  expiresAt: Date,
  lastActivity: Date
}
```

### Session Limits

- **Maximum 5 active sessions per user**
- Oldest sessions automatically deleted when limit reached
- Manual logout from single device
- Manual logout from all devices

### Session Expiry

**Automatic Cleanup:**
- TTL index on `expiresAt` field
- MongoDB automatically deletes expired sessions
- Refresh token lifetime: 7 days
- Access token lifetime: 15 minutes

**Activity Tracking:**
- `lastActivity` updated on every authenticated request
- Helps identify inactive sessions
- Used for security monitoring

---

## Audit Logging

### Auth Events Logged

1. **login_success**: User successfully authenticated
2. **login_failure**: Failed authentication attempt with reason
3. **logout**: User logged out from single device
4. **logout_all**: User logged out from all devices
5. **token_refresh**: Access token refreshed
6. **session_expired**: Session expired or invalidated
7. **brute_force_block**: IP or user blocked due to too many attempts
8. **unauthorized_access**: Attempted access without proper permissions

### Log Structure

**Stored in:** `AuditLog` collection
```javascript
{
  action: String,          // Event type
  moderatorId: String,     // User who performed action (or "system")
  targetUserId: String,    // Affected user
  details: Object,         // Event-specific data (IP, reason, etc.)
  reason: String,          // Optional reason
  createdAt: Date          // Timestamp
}
```

**Fallback Logging:**
- If AuditLog model doesn't support auth events, logs to console
- Ensures no security events are lost
- Format: `[AUTH AUDIT] Event - Details`

### Audit Log Access

- Admins can view all audit logs via `/api/moderation/audit-logs`
- Filterable by action type, moderator, date range
- Exportable to CSV/JSON
- Real-time streaming via WebSocket

---

## CSRF Protection

### Why CSRF Protection Is Not Required

**This API is NOT vulnerable to CSRF attacks because:**

1. **JWT tokens stored in localStorage (not cookies)**
   - CSRF attacks exploit automatic cookie submission
   - localStorage requires explicit JavaScript access
   - Browsers don't automatically send localStorage data

2. **Authorization header (not cookies)**
   - API uses `Authorization: Bearer <token>` header
   - Headers cannot be set by cross-origin requests without CORS
   - CSRF attacks cannot forge Authorization headers

3. **CORS restrictions in place**
   - API only accepts requests from configured origins
   - Preflight requests required for non-simple requests
   - Cross-origin requests without proper headers are rejected

### What CSRF Protection Would Address

CSRF protection (e.g., double-submit cookies, synchronizer tokens) is necessary when:
- Authentication uses cookies (especially with `SameSite=None`)
- State-changing operations accept cookies as credentials
- Automatic credential submission occurs

### Alternative Security Measures in Place

Instead of CSRF tokens, we implement:
- **Origin validation** via CORS
- **Token expiry** (15 minutes for access tokens)
- **Rate limiting** on state-changing endpoints
- **Audit logging** of all actions
- **Permission checks** on every operation

### Additional Context

If in the future the dashboard:
- Uses cookie-based authentication
- Implements a session-based auth system
- Requires state persistence in cookies

Then CSRF protection should be implemented using:
- `csurf` npm package for Express
- Double-submit cookie pattern
- Custom request header verification

---

## Rate Limiting

### Global Rate Limiter

- **100 requests per 15 minutes per IP**
- Applies to all API endpoints
- Returns `429 Too Many Requests` when exceeded
- Headers: `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`

### Endpoint-Specific Limiters

**Auth Endpoints:**
- 5 requests per 15 minutes per IP
- Protects `/api/auth/telegram` and `/api/auth/refresh`
- Prevents automated credential testing

**Export Endpoints:**
- 10 requests per hour per IP
- Prevents abuse of resource-intensive operations
- Applies to all `/api/export/*` routes

**WebSocket Connections:**
- 5 connections per minute per IP
- Prevents connection flooding
- Applies to Socket.io handshake

### Implementation

**Library:** `express-rate-limit`
**Storage:** In-memory (default)
**Production Recommendation:** Use Redis for distributed deployments

---

## Security Headers

### Helmet.js Configuration

Automatically sets secure HTTP headers:

1. **Content-Security-Policy (CSP)**
   - Prevents XSS attacks
   - Restricts resource loading

2. **X-Frame-Options**
   - Set to `DENY`
   - Prevents clickjacking attacks

3. **X-Content-Type-Options**
   - Set to `nosniff`
   - Prevents MIME-type sniffing

4. **Strict-Transport-Security (HSTS)**
   - Enforces HTTPS
   - Max age: 1 year

5. **X-XSS-Protection**
   - Enables browser XSS filter
   - Mode: block

### CORS Configuration

**Allowed Origins:**
- Configurable via `DASHBOARD_URL` environment variable
- Default: `http://localhost:3000` (development)
- Production: Set to actual dashboard domain

**Allowed Methods:**
- GET, POST, PUT, DELETE

**Credentials:**
- Enabled for cross-origin requests
- Required for WebSocket connections

---

## Input Validation

### Zod Schema Validation

All incoming requests validated with Zod schemas:

**Benefits:**
- Type-safe validation
- Clear error messages
- Runtime type checking
- TypeScript integration

**Example:**
```javascript
const loginSchema = z.object({
  id: z.number(),
  first_name: z.string(),
  auth_date: z.number(),
  hash: z.string().length(64),
});
```

### Sanitization

**HTML Escaping:**
- All user inputs escaped before storage or display
- Prevents XSS attacks

**SQL/NoSQL Injection:**
- Mongoose parameterized queries
- No raw query string concatenation
- Input validation before database operations

---

## Best Practices

### Environment Variables

**Required Secrets:**
- `JWT_ACCESS_SECRET` (32+ characters)
- `JWT_REFRESH_SECRET` (32+ characters)
- `BOT_TOKEN` (from @BotFather)

**Generation:**
```bash
# Generate secure random secrets
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Never commit:**
- `.env` files
- Secrets in code
- Configuration with credentials

### Production Checklist

- [ ] Use strong JWT secrets (32+ characters)
- [ ] Enable HTTPS/TLS
- [ ] Set `NODE_ENV=production`
- [ ] Configure proper CORS origins
- [ ] Use Redis for rate limiting (distributed)
- [ ] Enable MongoDB authentication
- [ ] Set up monitoring and alerting
- [ ] Regular security audits
- [ ] Keep dependencies updated
- [ ] Enable database backups

### Secure Deployment

**Reverse Proxy (Nginx):**
- Terminate SSL/TLS
- Add additional security headers
- Rate limiting at proxy level
- DDoS protection

**Process Manager (PM2):**
- Automatic restart on crashes
- Memory limit enforcement
- Log rotation
- Multi-instance clustering

**Database Security:**
- MongoDB authentication enabled
- Connection string with credentials
- Network isolation (firewall rules)
- Regular backups

---

## Security Incident Response

### Detecting Attacks

**Signs of brute force attack:**
- High number of `LoginAttempt` records
- Multiple blocked IPs
- Auth audit logs with many failures

**Signs of unauthorized access:**
- Audit logs showing permission denials
- Failed token validation attempts
- Suspicious user agent patterns

### Response Actions

1. **Brute Force Attack:**
   - Review `LoginAttempt` collection
   - Ban persistent attacking IPs at firewall level
   - Increase block duration temporarily
   - Notify affected users

2. **Compromised Account:**
   - Invalidate all user sessions (`/api/auth/logout-all`)
   - Force password reset (if implemented)
   - Review audit logs for unauthorized actions
   - Notify user via bot

3. **API Abuse:**
   - Review rate limit violations
   - Temporarily reduce rate limits
   - Ban abusive IPs
   - Review audit logs for patterns

### Monitoring

**Key Metrics:**
- Failed login attempts per hour
- Blocked IPs/users count
- Unauthorized access attempts
- Rate limit violations
- Session count per user

**Alerting:**
- Email/SMS on multiple blocked attempts
- Webhook notifications for admin actions
- Dashboard alerts for security events

---

## Testing

### Security Test Suite

Located: `dashboard-api/__tests__/security.test.js`

**Test Coverage:**
- ✅ Brute force protection (IP and user)
- ✅ Session management and limits
- ✅ Permission checks by role
- ✅ Token security and validation
- ✅ Login attempt tracking
- ✅ Session invalidation

**Run Tests:**
```bash
cd dashboard-api
npm test security.test.js
```

### Manual Security Testing

**Tools:**
- OWASP ZAP (automated vulnerability scanning)
- Burp Suite (manual testing)
- Postman (API testing)
- Artillery (load testing)

**Test Cases:**
- SQL/NoSQL injection attempts
- XSS payload injection
- CSRF token bypass (should fail)
- Authorization bypass attempts
- Rate limit testing
- Brute force simulation

---

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [NIST Authentication Guidelines](https://pages.nist.gov/800-63-3/)

---

## Security Contact

If you discover a security vulnerability, please contact:
- **Method**: Create a private security advisory on GitHub
- **Response Time**: Within 48 hours
- **Disclosure**: Responsible disclosure appreciated

Do NOT create public issues for security vulnerabilities.

---

**Last Updated**: November 3, 2025
**API Version**: 2.1.0
