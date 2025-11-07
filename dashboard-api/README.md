# SecretLounge-Bot Dashboard API

REST API server for the SecretLounge-Bot admin dashboard.

## Phase 1: Backend API Foundation ✅

This is the **Phase 1** implementation, providing:
- Express.js server with security middleware
- Telegram OAuth authentication
- JWT-based session management
- Role-based access control (RBAC)
- Rate limiting
- Request validation

## Quick Start

### 1. Install Dependencies

```bash
cd dashboard-api
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` and configure:

```env
# MongoDB (shared with bot)
MONGO_URI=mongodb://localhost:27017
DBNAME=lobbyBot

# API Server
API_PORT=3001
NODE_ENV=development

# JWT Secrets (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_ACCESS_SECRET=your-64-char-secret-here
JWT_REFRESH_SECRET=your-64-char-secret-here

# Bot Token (same as main bot)
BOT_TOKEN=your-bot-token-from-botfather

# CORS
DASHBOARD_URL=http://localhost:3000
```

**Generate secure JWT secrets:**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Start the Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

The API will be available at `http://localhost:3001`

## API Endpoints

### Health Check

```
GET /api/health
```

**Response:**
```json
{
  "success": true,
  "message": "Dashboard API is running",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "uptime": 123.456
}
```

### Authentication

#### POST /api/auth/telegram

Authenticate with Telegram OAuth data.

**Request:**
```json
{
  "id": 123456789,
  "first_name": "John",
  "username": "johndoe",
  "photo_url": "https://...",
  "auth_date": 1234567890,
  "hash": "abc123..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Authentication successful",
  "data": {
    "user": {
      "id": "123456789",
      "alias": "JohnAlias",
      "role": "admin",
      "permissions": ["*"]
    },
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "expiresIn": 900
  }
}
```

#### POST /api/auth/refresh

Refresh access token.

**Request:**
```json
{
  "refreshToken": "eyJhbGc..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGc...",
    "expiresIn": 900
  }
}
```

#### GET /api/auth/me

Get current user info (requires authentication).

**Headers:**
```
Authorization: Bearer <access-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "123456789",
    "alias": "JohnAlias",
    "role": "admin",
    "permissions": ["*"],
    "inLobby": true,
    "joinDate": "2025-01-01T00:00:00.000Z"
  }
}
```

#### POST /api/auth/logout

Logout (invalidate current session).

**Headers:**
```
Authorization: Bearer <access-token>
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

#### POST /api/auth/logout-all

Logout from all devices.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out from all devices"
}
```

## Security Features

### Rate Limiting

- **Global:** 100 requests per 15 minutes per IP
- **Auth endpoints:** 5 requests per 15 minutes per IP
- **Export endpoints:** 10 requests per hour per IP (future)

### Headers

- Helmet.js security headers
- CORS protection
- Content Security Policy
- XSS protection

### Token Security

- Access tokens: 15 minutes expiry
- Refresh tokens: 7 days expiry
- Tokens hashed before storage (SHA256)
- Max 5 active sessions per user

### Input Validation

- Zod schema validation
- Request sanitization
- Null byte removal

## Role-Based Access Control

### Roles

- **admin:** Full access to all features
- **mod:** Limited moderation and viewing permissions
- **whitelist:** No dashboard access by default

### Permission System

Permissions follow the format: `category.action`

**Categories:**
- `dashboard.*` - Dashboard access
- `stats.*` - Statistics viewing
- `users.*` - User management
- `settings.*` - Settings management
- `content.*` - Content management
- `moderation.*` - Moderation tools
- `permissions.*` - Permission management

See `config/permissions.js` for full permission matrix.

## Database Models

### Session

Stores API session information:

```javascript
{
  userId: String,
  accessTokenHash: String,
  refreshTokenHash: String,
  ipAddress: String,
  userAgent: String,
  expiresAt: Date,
  lastActivity: Date,
}
```

**Indexes:**
- `userId` - Find user sessions
- `accessTokenHash` - Token verification
- `refreshTokenHash` - Token refresh
- `expiresAt` - TTL index for auto-cleanup

### Shared Models

The API shares these models with the main bot:
- `User` - User information
- `Activity` - User activity tracking
- `AuditLog` - Moderation logs
- `RelayedMessage` - Message relay data
- `Report` - User reports

## Testing

### Using curl

**Health check:**
```bash
curl http://localhost:3001/api/health
```

**Login (with Telegram auth data):**
```bash
curl -X POST http://localhost:3001/api/auth/telegram \
  -H "Content-Type: application/json" \
  -d '{
    "id": 123456789,
    "first_name": "John",
    "auth_date": 1234567890,
    "hash": "abc123..."
  }'
```

**Get current user:**
```bash
curl http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Using Postman

1. Import the environment variables
2. Set `API_URL` to `http://localhost:3001`
3. Test authentication endpoints
4. Use returned tokens in subsequent requests

## Development

### Project Structure

```
dashboard-api/
├── server.js                 # Express server entry
├── config/
│   ├── database.js          # MongoDB connection
│   └── permissions.js       # Permission definitions
├── middleware/
│   ├── auth.js              # JWT verification
│   ├── rbac.js              # Role-based access control
│   ├── rateLimit.js         # Rate limiting
│   ├── validation.js        # Request validation
│   └── errorHandler.js      # Error handling
├── routes/
│   ├── index.js             # Route aggregator
│   └── auth.js              # Auth routes
├── controllers/
│   └── authController.js    # Auth handlers
├── services/
│   └── authService.js       # Business logic
├── models/
│   └── Session.js           # Session model
└── utils/
    ├── telegram.js          # Telegram auth
    ├── jwt.js               # JWT utilities
    └── validators.js        # Zod schemas
```

### Adding New Routes

1. Create route file in `routes/`
2. Import and mount in `routes/index.js`
3. Use middleware for auth and permissions

Example:

```javascript
// routes/users.js
import { requirePermission } from "../middleware/rbac.js";
import { PERMISSIONS } from "../config/permissions.js";

router.get(
  "/",
  authenticate,
  requirePermission(PERMISSIONS.USERS_VIEW),
  getUsersController
);
```

## Troubleshooting

### "Invalid Telegram authentication data"

- Verify `BOT_TOKEN` is correct
- Check that `auth_date` is within 24 hours
- Ensure all required fields are present
- Verify hash calculation matches Telegram's

### "User not registered"

- User must register via the bot first (`/register` command)
- Check MongoDB connection to bot's database

### "You do not have permission to access the dashboard"

- Only users with `admin` or `mod` roles can access
- Check user role in database: `db.users.findOne({ _id: "USER_ID" })`

### "Session not found or expired"

- Access token expired (15 minutes)
- Use refresh token to get new access token
- Re-authenticate if refresh token also expired

## Next Steps

Phase 1 is complete! Next phases:

- **Phase 2:** Core API Endpoints (stats, users, settings, moderation)
- **Phase 3:** WebSocket Implementation
- **Phase 4:** Next.js Frontend

## License

Same license as the main SecretLounge-Bot project.
