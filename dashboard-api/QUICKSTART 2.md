# Dashboard API - Quick Start Guide

## Start the Server

```bash
cd dashboard-api
npm start
```

The API will be available at `http://localhost:3001`

## Test the Server

### 1. Health Check
```bash
curl http://localhost:3001/api/health
```

Expected response:
```json
{
  "success": true,
  "message": "Dashboard API is running",
  "timestamp": "2025-11-03T...",
  "uptime": 5.00
}
```

### 2. API Info
```bash
curl http://localhost:3001/api
```

Expected response:
```json
{
  "success": true,
  "message": "TG-Lobby-Bot Dashboard API",
  "version": "1.0.0",
  "phase": "Phase 1 - Backend API Foundation",
  "endpoints": {
    "health": "GET /api/health",
    "auth": "POST /api/auth/*"
  }
}
```

## Authentication Flow

### Step 1: Get Telegram Auth Data

In a real application, this comes from the Telegram Login Widget. For testing:

```javascript
// This is example data - replace with real Telegram auth data
{
  "id": 123456789,
  "first_name": "YourName",
  "username": "yourusername",
  "auth_date": 1234567890,
  "hash": "calculated_hash"
}
```

### Step 2: Login

```bash
curl -X POST http://localhost:3001/api/auth/telegram \
  -H "Content-Type: application/json" \
  -d '{
    "id": 123456789,
    "first_name": "YourName",
    "auth_date": 1730635000,
    "hash": "your_calculated_hash"
  }'
```

### Step 3: Use Access Token

```bash
# Save the accessToken from login response
ACCESS_TOKEN="eyJhbGc..."

# Get current user info
curl http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

### Step 4: Refresh Token

```bash
REFRESH_TOKEN="eyJhbGc..."

curl -X POST http://localhost:3001/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\": \"$REFRESH_TOKEN\"}"
```

### Step 5: Logout

```bash
curl -X POST http://localhost:3001/api/auth/logout \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

## Important Notes

1. **Only admin and mod roles** can access the dashboard
2. User must be **registered in the bot** first (via `/register` command)
3. Access tokens expire after **15 minutes**
4. Refresh tokens expire after **7 days**
5. Maximum **5 active sessions** per user

## Troubleshooting

### "User not registered"
→ Register via the bot first: `/register <alias>`

### "You do not have permission to access the dashboard"
→ User must have `admin` or `mod` role in the database

### "Invalid or expired token"
→ Use refresh token to get new access token, or re-authenticate

### Server won't start
→ Check environment variables in `.env` file
→ Ensure MongoDB is accessible
→ Verify BOT_TOKEN is correct

## Environment Variables

Required variables in `.env`:
```env
MONGO_URI=mongodb://...          # MongoDB connection
DBNAME=lobbyBot2                # Database name
API_PORT=3001                    # Server port
JWT_ACCESS_SECRET=...            # 64+ chars
JWT_REFRESH_SECRET=...           # 64+ chars
BOT_TOKEN=...                    # From @BotFather
DASHBOARD_URL=http://localhost:3000
```

## Development Mode

```bash
# Auto-reload on file changes
npm run dev
```

## Production Mode

```bash
# Set environment to production
NODE_ENV=production npm start
```

## Next Steps

After Phase 1, implement Phase 2 to add:
- Statistics endpoints
- User management endpoints
- Settings management endpoints
- Moderation endpoints

See `Dashboard.md` for full implementation plan.
