# SecretLounge-Bot Dashboard API

REST API server for the SecretLounge-Bot admin dashboard.

## Full-Featured Dashboard API ✅

Complete implementation providing:
- Express.js server with comprehensive security middleware
- Telegram OAuth authentication
- JWT-based session management with auto-refresh
- Role-based access control (RBAC) with custom roles
- WebSocket support for real-time updates
- Rate limiting and DDoS protection
- Request validation with Zod schemas
- Complete REST API for all bot features
- Internal API for bot-to-dashboard communication
- Notification system with preferences
- System health monitoring
- Database-backed permission system

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

---

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

---

### Users

#### GET /api/users

Get all users with optional filtering.

**Query Parameters:**
- `search` - Search by alias
- `role` - Filter by role
- `status` - Filter by status (active, banned, muted)
- `inLobby` - Filter by lobby status

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "123456789",
        "alias": "JohnDoe",
        "icon": "🎭",
        "role": "admin",
        "customRoles": ["moderator"],
        "inLobby": true,
        "status": "online",
        "joinDate": "2025-01-01T00:00:00.000Z"
      }
    ],
    "total": 100
  }
}
```

#### GET /api/users/:id

Get detailed user information.

#### PUT /api/users/:id/role

Update user's system role.

#### POST /api/users/:id/ban

Ban a user.

#### POST /api/users/:id/mute

Mute a user.

#### POST /api/users/:id/kick

Kick user from lobby.

#### POST /api/users/:id/assign-roles

Assign custom roles to user.

---

### Permissions

#### GET /api/permissions/custom-roles

Get all custom roles.

#### POST /api/permissions/custom-roles

Create a new custom role.

#### PUT /api/permissions/custom-roles/:id

Update custom role.

#### DELETE /api/permissions/custom-roles/:id

Delete custom role.

#### GET /api/permissions/system-roles

Get all system roles.

#### PUT /api/permissions/system-roles/:roleId

Update system role properties (emoji, color, etc.).

---

### Settings

#### GET /api/settings

Get all bot settings.

#### PUT /api/settings/:key

Update a specific setting.

---

### Moderation

#### GET /api/moderation/reports

Get all user reports with pagination.

#### GET /api/moderation/reports/:id

Get specific report details.

#### POST /api/moderation/reports/:id/resolve

Resolve a report.

---

### Audit Logs

#### GET /api/audit

Get audit logs with filtering.

**Query Parameters:**
- `action` - Filter by action type
- `moderatorId` - Filter by moderator
- `targetUserId` - Filter by target user
- `page` - Page number
- `limit` - Items per page

---

### Statistics

#### GET /api/stats

Get comprehensive bot statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "users": {
      "total": 1000,
      "inLobby": 500,
      "online": 50,
      "banned": 10
    },
    "messages": {
      "total": 50000,
      "today": 1000,
      "thisWeek": 7000
    }
  }
}
```

#### GET /api/stats/user/:userId

Get statistics for a specific user.

---

### Logs

#### GET /api/logs

Get bot logs with filtering.

**Query Parameters:**
- `level` - Filter by log level
- `category` - Filter by category
- `startDate` - Start date
- `endDate` - End date

#### POST /api/logs/event

Log an event from the bot (internal use).

---

### Notifications

#### GET /api/notifications

Get notifications for authenticated user.

**Query Parameters:**
- `page` - Page number
- `limit` - Items per page
- `unreadOnly` - Show only unread
- `type` - Filter by type

#### PATCH /api/notifications/:id/read

Mark notification as read.

#### DELETE /api/notifications/:id

Delete a notification.

#### PATCH /api/notifications/read-all

Mark all notifications as read.

#### GET /api/notifications/preferences

Get notification preferences.

#### PUT /api/notifications/preferences

Update notification preferences.

---

### System

#### GET /api/system/health

Get system health status.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "memory": {
      "used": 150000000,
      "total": 500000000
    },
    "uptime": 86400
  }
}
```

#### GET /api/system/stats

Get system statistics.

---

### Internal (Bot-to-Dashboard)

These endpoints are used by the bot to trigger WebSocket events:

#### POST /api/internal/emit/report

Emit new report event.

#### POST /api/internal/emit/moderation

Emit moderation action event.

#### POST /api/internal/emit/spam

Emit spam alert event.

#### POST /api/internal/emit/user-joined

Emit user joined event.

#### POST /api/internal/emit/user-left

Emit user left event.

#### POST /api/internal/emit/settings-change

Emit settings change event.

#### POST /api/internal/emit/audit-log

Emit audit log event.

---

## WebSocket Events

The API emits various WebSocket events for real-time updates:

### Event Types

- `stats:update` - Statistics updated
- `user:joined` - User joined lobby
- `user:left` - User left lobby
- `report:new` - New report created
- `moderation:action` - Moderation action taken
- `spam:alert` - Spam detected
- `audit:log` - New audit log entry
- `settings:change` - Settings updated
- `notification:new` - New notification created
- `bot:log` - Bot log event
- `bot:error` - Bot error event
- `relay:failure` - Message relay failed
- `user:blocked` - User blocked the bot
- `system:health` - System health update

### Connection

Connect to WebSocket server at `ws://localhost:3001` with authentication:

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3001', {
  auth: {
    token: 'your-jwt-access-token'
  }
});

socket.on('stats:update', (data) => {
  console.log('Stats updated:', data);
});
```

---

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

### API-Specific Models

#### Session
Stores API session information for JWT authentication.

#### Notification
In-app notifications for dashboard users.

```javascript
{
  userId: String,
  type: String, // report, moderation, user_action, system, security, announcement
  title: String,
  message: String,
  priority: String, // low, medium, high, critical
  read: Boolean,
  readAt: Date,
  metadata: Object,
  expiresAt: Date, // 30-day TTL
}
```

#### NotificationPreferences
User preferences for notifications.

```javascript
{
  userId: String,
  enabledTypes: [String],
  soundEnabled: Boolean,
  desktopEnabled: Boolean,
}
```

#### BotLog
Bot logs streamed to dashboard.

```javascript
{
  level: String, // info, warn, error
  category: String,
  message: String,
  metadata: Object,
  timestamp: Date,
  expiresAt: Date, // 30-day TTL
}
```

### Shared Models

The API shares these models with the main bot:
- `User` - User information and authentication
- `Activity` - User activity tracking
- `AuditLog` - Moderation action logs
- `RelayedMessage` - Message relay data
- `Report` - User reports
- `Setting` - Global bot settings
- `CustomRole` - Custom role definitions
- `SystemRole` - System role configuration
- `Poll` - Poll data
- `ContentFilter` - Content filters
- `Block` - User blocking
- `SpamDetection` - Spam detection data
- And 10+ more models (see main bot docs)

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
├── app.js                           # Express app configuration
├── server.js                        # Server entry point with WebSocket
├── config/
│   ├── database.js                  # MongoDB connection
│   ├── permissions.js               # Permission definitions (RBAC)
│   └── socket.js                    # Socket.io configuration
├── middleware/
│   ├── auth.js                      # JWT verification
│   ├── rbac.js                      # Role-based access control
│   ├── rateLimit.js                 # Rate limiting
│   ├── validation.js                # Request validation
│   └── errorHandler.js              # Error handling
├── routes/
│   ├── index.js                     # Route aggregator
│   ├── auth.js                      # Authentication routes
│   ├── users.js                     # User management routes
│   ├── permissions.js               # Permission & role management
│   ├── settings.js                  # Bot settings routes
│   ├── moderation.js                # Moderation routes
│   ├── audit.js                     # Audit log routes
│   ├── stats.js                     # Statistics routes
│   ├── logs.js                      # Log management routes
│   ├── notifications.js             # Notification routes
│   ├── system.js                    # System health routes
│   └── internal.js                  # Internal bot-to-dashboard routes
├── controllers/
│   ├── authController.js            # Authentication handlers
│   ├── usersController.js           # User management handlers
│   ├── permissionsController.js     # Permission handlers
│   ├── settingsController.js        # Settings handlers
│   ├── moderationController.js      # Moderation handlers
│   ├── auditController.js           # Audit log handlers
│   ├── statsController.js           # Statistics handlers
│   ├── logsController.js            # Log handlers
│   ├── notificationsController.js   # Notification handlers
│   ├── systemController.js          # System health handlers
│   ├── batchController.js           # Batch operation handlers
│   ├── contentController.js         # Content management handlers
│   └── exportController.js          # Data export handlers
├── services/
│   ├── authService.js               # Auth business logic
│   ├── userService.js               # User management logic
│   ├── moderationService.js         # Moderation logic
│   ├── statsService.js              # Statistics logic
│   ├── socketService.js             # WebSocket event emissions
│   ├── notificationService.js       # Notification management
│   └── systemService.js             # System monitoring logic
├── models/
│   ├── Session.js                   # API sessions
│   ├── Notification.js              # In-app notifications
│   ├── NotificationPreferences.js   # Notification preferences
│   └── BotLog.js                    # Bot logs
└── utils/
    ├── telegram.js                  # Telegram auth
    ├── jwt.js                       # JWT utilities
    └── validators.js                # Zod schemas
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

## Features Summary

### ✅ Completed Features

- **Authentication & Authorization**
  - Telegram OAuth integration
  - JWT-based sessions with auto-refresh
  - Role-based access control (RBAC)
  - Permission system with custom roles
  - Multi-session management

- **User Management**
  - User listing with search and filters
  - User details and statistics
  - Ban, mute, kick operations
  - Role assignment (system and custom roles)
  - Bulk moderation actions

- **Permissions & Roles**
  - Custom role creation and management
  - System role customization
  - Permission matrix
  - Role-based API access control

- **Settings Management**
  - Global bot settings
  - Invite system configuration
  - Compliance rules
  - Content filters
  - Slowmode settings

- **Moderation**
  - Report management
  - Audit log with filtering
  - Moderation action tracking
  - Spam detection configuration

- **Statistics & Analytics**
  - Real-time bot statistics
  - User-specific statistics
  - Message metrics
  - Activity tracking

- **Real-time Updates**
  - WebSocket integration
  - Live statistics updates
  - Event notifications
  - Bot log streaming
  - System health monitoring

- **Notifications**
  - In-app notification system
  - Notification preferences
  - Multiple notification types
  - Real-time delivery via WebSocket

- **System Monitoring**
  - Health check endpoints
  - Memory usage tracking
  - Uptime monitoring
  - System statistics

- **Security**
  - Rate limiting (global and per-endpoint)
  - Input validation with Zod
  - Security headers (Helmet.js)
  - CORS protection
  - Token hashing
  - Session management

### 📚 Documentation

See the main bot documentation for detailed information:
- **[docs/COMMANDS.md](../docs/COMMANDS.md)** - Bot commands reference
- **[docs/MODELS.md](../docs/MODELS.md)** - Database schemas
- **[docs/SYSTEMS.md](../docs/SYSTEMS.md)** - System documentation
- **[docs/DASHBOARD.md](../docs/DASHBOARD.md)** - Dashboard architecture

## Deployment

For production deployment instructions, see **[docs/DASHBOARD.md](../docs/DASHBOARD.md)** which includes:
- PM2 configuration
- Nginx setup
- SSL/TLS configuration
- Environment variables
- Server setup guide

## License

Same license as the main SecretLounge-Bot project.
