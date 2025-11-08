# Database Models Reference

Complete reference for all MongoDB database schemas and models.

## Table of Contents

- [Core Models](#core-models)
  - [User](#user)
  - [Activity](#activity)
- [Messaging Models](#messaging-models)
  - [RelayedMessage](#relayedmessage)
  - [QuoteLink](#quotelink)
  - [Poll](#poll)
  - [PinnedMessage](#pinnedmessage)
- [Moderation Models](#moderation-models)
  - [Report](#report)
  - [Filter](#filter)
  - [SpamDetection](#spamdetection)
  - [AuditLog](#auditlog)
  - [Block](#block)
- [Configuration Models](#configuration-models)
  - [Setting](#setting)
  - [Preferences](#preferences)
  - [CustomRole](#customrole)
  - [SystemRole](#systemrole)
- [Access Control Models](#access-control-models)
  - [Invite](#invite)
  - [LinkWhitelist](#linkwhitelist)
  - [LoginToken](#logintoken)
- [Scheduling Models](#scheduling-models)
  - [ScheduledAnnouncement](#scheduledannouncement)
- [System Models](#system-models)
  - [BotLog](#botlog)
  - [Instance](#instance)

---

## Core Models

### User

**File**: `src/models/User.js`

**Purpose**: Stores user registration, profile, and moderation status.

**Schema**:

```javascript
{
  _id: String,              // Telegram user ID (primary key)
  alias: String,            // Anonymous username (unique, required)
  icon: {
    customEmojiId: String,  // Telegram Premium custom emoji ID
    fallback: String        // Standard emoji fallback
  },
  inLobby: Boolean,         // Currently in lobby (default: false)
  role: String,             // 'admin', 'mod', 'whitelist', or null
  mutedUntil: Date,         // Temporary mute expiration (null if not muted)
  bannedUntil: Date,        // Temporary ban expiration (null if not banned)
  warnings: Number,         // Warning count (default: 0, 3 = perma-ban)
  mediaRestricted: Boolean, // Cannot send media (default: false)
  blockedBot: Boolean,      // User blocked the bot (detected via 403)
  blockedAt: Date,          // When user blocked the bot
  createdAt: Date,          // Registration timestamp
  updatedAt: Date           // Last update timestamp
}
```

**Indexes**:
- `alias`: Unique index for fast lookup and uniqueness enforcement
- `inLobby`: For filtering lobby members
- `role`: For permission checks

**Validation**:
- `alias`: 2-32 characters, alphanumeric + spaces/hyphens/underscores/apostrophes/periods
- `role`: Enum validation

**Notes**:
- `mutedUntil` and `bannedUntil` set to far future date (e.g., year 9999) for permanent restrictions
- `warnings` >= 3 triggers automatic permanent ban
- User automatically removed from lobby when `blockedBot` is set to true

---

### Activity

**File**: `src/models/Activity.js`

**Purpose**: Tracks user activity, status, media compliance, and statistics.

**Schema**:

```javascript
{
  _id: String,              // Telegram user ID (primary key)
  status: String,           // 'online', 'idle', 'offline'
  lastActive: Date,         // Last message/interaction timestamp
  lastOnlineChange: Date,   // Last time status changed to online
  mediaCount: {
    first24h: Number,       // Media sent in first 24 hours
    byDate: Map             // Date string → daily media count
  },
  totalMessages: Number,    // Total messages sent (default: 0)
  totalReplies: Number,     // Total replies sent (default: 0)
  totalTextMessages: Number,// Text-only messages (default: 0)
  totalMediaMessages: Number,// Media messages (default: 0)
  createdAt: Date,          // Activity tracking start timestamp
  updatedAt: Date           // Last update timestamp
}
```

**Indexes**:
- `status`: For filtering online/idle/offline users
- `lastActive`: For compliance checks and inactivity detection

**Status Transitions**:
- **Online**: Active message sending
- **Idle**: No activity for 15 minutes
- **Offline**: No activity for 60 minutes

**Notes**:
- Media counts used by compliance system
- Statistics used for profiles and leaderboards
- Automatic cleanup of status timers after offline transition

---

## Messaging Models

### RelayedMessage

**File**: `src/models/RelayedMessage.js`

**Purpose**: Persistent mapping of relayed messages for reply threading, edits, reactions, history.

**Schema**:

```javascript
{
  userId: String,           // Recipient's Telegram ID
  messageId: Number,        // Message ID in recipient's chat
  originalUserId: String,   // Original sender's Telegram ID
  originalMsgId: Number,    // Message ID in sender's chat
  originalItemMsgId: Number,// For media groups: individual item message ID
  messageType: String,      // 'text', 'photo', 'video', 'audio', etc.
  caption: String,          // Media caption (if any)
  fileId: String,           // Telegram file_id for media
  albumId: String,          // Media group ID (for albums)
  relayedAt: Date           // When message was relayed
}
```

**Indexes**:
- `userId` + `messageId`: Fast lookup for recipient's message
- `originalUserId` + `originalMsgId`: Find all copies of a message
- `originalItemMsgId`: For media group item lookup
- `relayedAt`: For history queries with time filtering

**Notes**:
- Used for reply threading (find original when user replies)
- Used for edit relay (update all copies)
- Used for reaction relay (sync across all copies)
- Used for history command (retrieve past messages)
- Persistent fallback when QuoteLink TTL expires
- No automatic TTL - grows over time

---

### QuoteLink

**File**: `src/models/QuoteLink.js`

**Purpose**: Temporary fast-lookup cache for reply threading.

**Schema**:

```javascript
{
  messageId: Number,        // Message ID in recipient's chat
  userId: String,           // Recipient's Telegram ID
  originalUserId: String,   // Original sender's Telegram ID
  originalMsgId: Number,    // Message ID in sender's chat
  senderAlias: String,      // Sender's alias (for display)
  preview: String,          // Message preview text
  createdAt: Date           // Creation timestamp (TTL indexed)
}
```

**Indexes**:
- `messageId` + `userId`: Primary lookup key
- `createdAt`: TTL index (expires after 2 minutes)

**Notes**:
- 2-minute TTL for memory efficiency
- Falls back to RelayedMessage for older messages
- Created for every relayed message via `linkRelay()`
- Includes preview and alias for rich context

---

### Poll

**File**: `src/models/Poll.js`

**Purpose**: Anonymous polls with vote tracking.

**Schema**:

```javascript
{
  creatorId: String,        // Poll creator's Telegram ID
  question: String,         // Poll question (required)
  options: [{
    text: String,           // Option text
    votes: [String]         // Array of voter Telegram IDs
  }],
  isActive: Boolean,        // Poll open for voting (default: true)
  relayedMessageIds: Map,   // userId → messageId mapping
  createdAt: Date,          // Poll creation timestamp
  updatedAt: Date           // Last update timestamp
}
```

**Validation**:
- 2-6 options required
- Question required
- Option text required

**Virtuals**:
- `totalVotes`: Computed from all option vote arrays

**Notes**:
- Anonymous voting - vote attribution not displayed
- Single-choice voting (changing vote removes from previous option)
- Real-time updates via inline keyboards
- `relayedMessageIds` used to update all copies when vote changes
- Only creator can close poll with `/endpoll`

---

### PinnedMessage

**File**: `src/models/PinnedMessage.js`

**Purpose**: Hybrid pinning system for announcements and relayed messages.

**Schema**:

```javascript
{
  type: String,             // 'announcement' or 'relayed'
  message: String,          // Text content (for announcements only)
  originalUserId: String,   // Original sender ID (for relayed type)
  originalMsgId: Number,    // Original message ID (for relayed type)
  relayedMessageIds: Map,   // userId → messageId mapping
  pinnedAt: Date,           // When pinned
  pinnedBy: String          // Admin who pinned it
}
```

**Validation**:
- `type`: Must be 'announcement' or 'relayed'
- Maximum 5 pinned messages enforced in command logic

**Notes**:
- **Announcement pins**: Created with `/pin <text>`, stores text and sends to all
- **Relayed pins**: Created by replying to message with `/pin`, pins existing message
- `relayedMessageIds` used for unpinning across all chats
- Native Telegram pins (appear at top of chat)
- Users can unpin locally without affecting others

---

## Moderation Models

### Report

**File**: `src/models/Report.js`

**Purpose**: User-submitted reports of problematic messages.

**Schema**:

```javascript
{
  reporterId: String,       // Who reported (Telegram ID)
  reportedUserId: String,   // Who was reported (Telegram ID)
  reportedAlias: String,    // Reported user's alias at time of report
  messageId: Number,        // Message ID in reporter's chat
  messagePreview: String,   // First 200 chars of message
  messageType: String,      // 'text', 'photo', etc.
  reason: String,           // Reporter's reason (optional)
  status: String,           // 'pending', 'resolved', 'dismissed'
  resolvedBy: String,       // Moderator who resolved (Telegram ID)
  resolutionAction: String, // 'none', 'warned', 'muted', 'banned', etc.
  resolutionNotes: String,  // Moderator's notes on resolution
  resolvedAt: Date,         // When resolved
  createdAt: Date           // When reported
}
```

**Indexes**:
- `status`: For filtering pending/resolved reports
- `reportedUserId`: For finding all reports about a user
- `createdAt`: For chronological ordering

**Validation**:
- `status`: Enum ('pending', 'resolved', 'dismissed')
- `resolutionAction`: Enum ('none', 'warned', 'muted', 'banned', 'kicked', 'media_restricted')

**Notes**:
- Moderators and admins notified of new reports
- Reporter notified when report is resolved
- Used for moderation accountability
- Message preview truncated to 200 characters

---

### Filter

**File**: `src/models/Filter.js`

**Purpose**: Content filtering rules (keywords and regex patterns).

**Schema**:

```javascript
{
  pattern: String,          // Keyword or regex pattern (required)
  isRegex: Boolean,         // Treat as regex (default: false)
  createdBy: String,        // Admin who created filter (Telegram ID)
  action: String,           // 'block' or 'notify' (default: 'block')
  active: Boolean,          // Filter enabled (default: true)
  notes: String,            // Internal notes about filter
  createdAt: Date,          // Creation timestamp
  updatedAt: Date           // Last update timestamp
}
```

**Indexes**:
- `active`: For fast filtering of active filters only

**Validation**:
- `action`: Enum ('block', 'notify')

**Notes**:
- Case-insensitive matching by default
- Checked against both message text and media captions
- Admins, mods, and whitelist role exempt
- Can be toggled active/inactive without deletion
- Blocked messages notify user with reason

---

### SpamDetection

**File**: `src/models/SpamDetection.js`

**Purpose**: Per-user spam violation tracking and auto-mute state.

**Schema**:

```javascript
{
  _id: String,              // Telegram user ID (primary key)
  violationCount: Number,   // Total violations (default: 0)
  lastViolation: Date,      // Most recent violation timestamp
  autoMuteLevel: Number,    // Escalation level (0-5)
  mutedUntil: Date,         // Auto-mute expiration
  recentMessages: [{
    content: String,        // Message content (for similarity check)
    timestamp: Date,        // When sent
    type: String           // Violation type detected
  }],
  whitelisted: Boolean,     // Exempt from spam detection (default: false)
  createdAt: Date,          // First violation timestamp
  updatedAt: Date           // Last update timestamp
}
```

**Auto-Mute Escalation**:
- Level 1: 5 minutes
- Level 2: 15 minutes
- Level 3: 1 hour
- Level 4: 24 hours
- Level 5+: 7 days

**Notes**:
- Separate from role-based whitelist (admin/mod/whitelist role)
- Spam-specific whitelist via `/antispam whitelist`
- Three detection types: flood, link spam, rapid-fire
- `recentMessages` buffer used for similarity detection (Levenshtein distance)
- Violation count persists for tracking repeat offenders

---

### AuditLog

**File**: `src/models/AuditLog.js`

**Purpose**: Persistent log of all moderation and administrative actions.

**Schema**:

```javascript
{
  action: String,           // Action type (e.g., 'ban', 'mute', 'filter_add')
  moderatorId: String,      // Who performed action (Telegram ID)
  moderatorAlias: String,   // Moderator's alias at time of action
  targetId: String,         // Target user ID (if applicable)
  targetAlias: String,      // Target user's alias (if applicable)
  details: Object,          // Action-specific details (flexible schema)
  reason: String,           // Reason provided for action
  timestamp: Date           // When action occurred (default: now)
}
```

**Indexes**:
- `action`: For filtering by action type
- `targetId`: For finding all actions on a user
- `moderatorId`: For finding all actions by a moderator
- `timestamp`: For chronological ordering and time-based queries

**Tracked Actions** (41+ types):
- **User moderation**: ban, unban, mute, unmute, kick, warn, media_restrict, media_unrestrict
- **Roles**: promote, demote, whitelist, unwhitelist, role_create, role_update, role_delete, role_assign, role_revoke
- **Content**: filter_add, filter_remove, filter_toggle, message_delete
- **Configuration**: slowmode_enable, slowmode_disable, invite_mode_on, invite_mode_off, welcome_enable, welcome_disable, maintenance_on, maintenance_off
- **Invites**: invite_create, invite_revoke, invite_activate, invite_delete
- **Reports**: report_resolve
- **Spam**: antispam_config, antispam_whitelist, antispam_unwhitelist, antispam_reset, antispam_clear
- **Announcements**: announce_lobby, announce_all, schedule_create, schedule_delete, schedule_pause, schedule_resume
- **Data**: export_users, export_messages, export_full

**Notes**:
- All admin/mod commands automatically logged
- `/auditlog` command provides filtering and pagination
- Used for accountability and compliance
- No automatic cleanup (permanent record)

---

### Block

**File**: `src/models/Block.js`

**Purpose**: Personal user blocking relationships.

**Schema**:

```javascript
{
  blockerId: String,        // Who is blocking (Telegram ID)
  blockedId: String,        // Who is blocked (Telegram ID)
  blockedAlias: String,     // Blocked user's alias (cached)
  createdAt: Date           // When block was created
}
```

**Indexes**:
- `blockerId` + `blockedId`: Compound unique index for relationship
- `blockerId`: For finding all users blocked by someone
- `blockedId`: For finding who has blocked a user

**Notes**:
- Personal setting - doesn't affect other users
- Blocked user's messages silently filtered during relay
- Blocker doesn't see blocked user's messages
- Blocked user unaware they're blocked
- Used in `/blocklist` to show user's blocks
- Can block/unblock via alias or reply to message

---

## Configuration Models

### Setting

**File**: `src/models/Setting.js`

**Purpose**: Global bot configuration (singleton document).

**Schema**:

```javascript
{
  _id: String,              // Always "global" (singleton)
  inviteOnly: Boolean,      // Require invite codes to join (default: false)
  rules: [{
    emoji: String,          // Rule emoji/icon
    text: String            // Rule text
  }],
  slowmodeEnabled: Boolean, // Slowmode active (default: false)
  slowmodeSeconds: Number,  // Delay between messages (1-3600)
  welcomeEnabled: Boolean,  // Send welcome messages (default: false)
  welcomeMessage: String,   // Custom welcome message
  maintenanceMode: Boolean, // Maintenance mode active (default: false)
  maintenanceMessage: String// Custom maintenance message
}
```

**Notes**:
- Single document with `_id: "global"`
- Updated via various admin commands
- Rules displayed with `/rules` command
- Slowmode exempts admin/mod/whitelist roles
- Welcome message supports HTML formatting
- Maintenance mode blocks non-admin users

---

### Preferences

**File**: `src/models/Preferences.js`

**Purpose**: Per-user personal preferences and settings.

**Schema**:

```javascript
{
  _id: String,              // Telegram user ID (primary key)
  hideStatusAnnouncements: Boolean,    // Hide online/idle/offline (default: false)
  compactMode: Boolean,                // Compact message format (default: false)
  hideJoinLeaveAnnouncements: Boolean, // Hide join/leave messages (default: false)
  notificationPreference: String,      // 'all', 'mentions_only', 'none' (default: 'all')
  autoMarkRead: Boolean,               // Auto-mark as read (default: false, future)
  createdAt: Date,
  updatedAt: Date
}
```

**Validation**:
- `notificationPreference`: Enum ('all', 'mentions_only', 'none')

**Notes**:
- Created on first preference change
- Quick toggles: `/compact`, `/quiet`
- Accessed via `/preferences` or `/prefs`
- Only affects user's own experience
- Future: `autoMarkRead` for Telegram read receipts

---

### CustomRole

**File**: `src/models/CustomRole.js`

**Purpose**: Custom permission-based roles beyond admin/mod/whitelist.

**Schema**:

```javascript
{
  name: String,             // Role name (unique, required)
  displayName: String,      // Human-readable name
  icon: String,             // Role icon/emoji
  color: String,            // Hex color code for display
  permissions: [String],    // Array of permission strings
  isSystem: Boolean,        // System role (cannot be deleted)
  priority: Number,         // Display priority (higher = more important)
  createdBy: String,        // Admin who created role (Telegram ID)
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes**:
- `name`: Unique index

**System Roles**:
- admin, mod, whitelist (cannot be deleted)

**Notes**:
- Managed via dashboard and admin commands
- Permission system extensible
- Users can have multiple custom roles
- Replaces deprecated `/promote` and `/demote` commands
- Priority determines display order in user lists

---

### SystemRole

**File**: `src/models/SystemRole.js`

**Purpose**: Database-backed configuration for system roles (owner, admin, mod, whitelist, user) with customizable properties.

**Schema**:

```javascript
{
  roleId: String,           // Role identifier (unique, required)
                           // Enum: "owner", "admin", "mod", "whitelist", "user"
  name: String,            // Display name (2-32 chars, required)
  description: String,     // Role description (max 500 chars)
  emoji: String,           // Role emoji/badge displayed in messages
  color: String,           // UI color (red, blue, green, amber, purple, pink, gray)
  permissions: [String],   // Array of permission strings
  isSystemRole: Boolean,   // Always true (immutable)
  isEditable: Boolean,     // Can be edited via dashboard (false for owner)
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes**:
- `roleId`: Unique index for fast lookup

**Static Methods**:
- `getRoleById(roleId)`: Get role by ID
- `getAllSystemRoles()`: Get all system roles
- `updateSystemRole(roleId, updates)`: Update role (owner protected)

**Instance Methods**:
- `canEdit()`: Check if role can be edited
- `validatePermissions()`: Validate permission strings

**Role Hierarchy**:
1. **Owner** (ADMIN_ID) - Full access, cannot be modified
2. **Admin** - Full moderation and configuration access
3. **Mod** - Limited moderation access (reports, temporary actions)
4. **Whitelist** - Exemptions from spam/slowmode/filters
5. **User** - Default role for all registered users

**Notes**:
- Created via database migration on startup
- Owner role protected from all modifications
- Role emojis displayed as badges in message headers
- Permissions cached for 5 minutes to reduce database load
- Dashboard allows editing emoji, color, permissions, and description
- Fallback to hardcoded defaults if database unavailable
- Integrated with RBAC permission system in dashboard-api

---

## Access Control Models

### Invite

**File**: `src/models/Invite.js`

**Purpose**: Invite code system for controlled lobby access.

**Schema**:

```javascript
{
  code: String,             // Unique invite code (random, required)
  createdBy: String,        // Admin who created invite (Telegram ID)
  maxUses: Number,          // Max times code can be used (0 = unlimited)
  uses: Number,             // Current use count (default: 0)
  expiresAt: Date,          // Expiration date (null = never)
  active: Boolean,          // Invite active (default: true)
  notes: String,            // Internal notes about invite
  usedBy: [{
    userId: String,         // Who used the code
    usedAt: Date            // When they used it
  }],
  createdAt: Date
}
```

**Indexes**:
- `code`: Unique index for fast lookup
- `active`: For filtering active invites

**States**:
- **Active**: Can be used (active=true, not expired, uses < maxUses)
- **Revoked**: Manually deactivated (active=false)
- **Expired**: Past expiresAt date
- **Exhausted**: uses >= maxUses

**Notes**:
- Cryptographically secure random codes
- Duration parsing: `7d`, `24h`, `2025-12-31`
- Tracks who used each invite
- Can be reactivated after revocation
- Cannot reactivate expired or exhausted invites

---

### LinkWhitelist

**File**: `src/models/LinkWhitelist.js`

**Purpose**: Whitelisted domains/URLs exempt from link spam detection.

**Schema**:

```javascript
{
  pattern: String,          // Domain or URL pattern (required)
  isRegex: Boolean,         // Treat as regex (default: false)
  addedBy: String,          // Admin who added (Telegram ID)
  notes: String,            // Internal notes
  createdAt: Date
}
```

**Notes**:
- Prevents false positives for trusted domains
- Useful for community-specific allowed links
- Checked before link spam detection
- Can be domain (e.g., `github.com`) or full URL pattern

---

### LoginToken

**File**: `src/models/LoginToken.js`

**Purpose**: Dashboard QR code authentication tokens.

**Schema**:

```javascript
{
  token: String,            // Random authentication token (unique)
  userId: String,           // Telegram user ID (if authenticated)
  used: Boolean,            // Token has been used (default: false)
  expiresAt: Date,          // Token expiration (15 minutes TTL)
  createdAt: Date
}
```

**Indexes**:
- `token`: Unique index
- `expiresAt`: TTL index for automatic cleanup

**Flow**:
1. User visits dashboard login page
2. Dashboard generates token and shows QR code
3. User scans QR, opens `/start login_<token>`
4. Bot validates token, sets `userId`, marks `used`
5. Dashboard polls API, receives user ID
6. JWT session created for user

**Notes**:
- 15-minute expiration for security
- Single-use tokens
- Automatic cleanup via TTL index
- Part of Telegram OAuth flow

---

## Scheduling Models

### ScheduledAnnouncement

**File**: `src/models/ScheduledAnnouncement.js`

**Purpose**: Automated scheduled announcements (one-time and recurring).

**Schema**:

```javascript
{
  type: String,             // 'once' or 'recurring'
  message: String,          // Announcement content (required)
  scheduledFor: Date,       // One-time: execution time
  cronPattern: String,      // Recurring: cron pattern
  sendToAll: Boolean,       // Send to all users vs lobby only (default: false)
  active: Boolean,          // Announcement active (default: true)
  createdBy: String,        // Admin who created (Telegram ID)
  sentCount: Number,        // Times announcement sent (default: 0)
  lastSent: Date,           // Last execution timestamp
  notes: String,            // Internal notes
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes**:
- `type`: For filtering by announcement type
- `active`: For filtering active announcements
- `scheduledFor`: For querying upcoming one-time announcements

**Cron Presets**:
- `daily-9am`, `daily-12pm`, `daily-6pm`, `daily-midnight`
- `weekly-monday`, `weekly-friday`, `weekly-sunday`
- `hourly`, `every-3h`, `every-6h`

**Notes**:
- One-time announcements: `scheduledFor` date/time
- Recurring announcements: cron pattern
- Can be paused/resumed without deletion
- Tracks execution history (sentCount, lastSent)
- Supports HTML formatting in message
- Executed by cron scheduler in bot

---

## System Models

### BotLog

**File**: `src/models/BotLog.js`

**Purpose**: Live logging for dashboard with automatic cleanup.

**Schema**:

```javascript
{
  level: String,            // 'info', 'warn', 'error'
  category: String,         // Log category
  message: String,          // Log message
  details: Object,          // Additional details (flexible)
  timestamp: Date,          // Log timestamp
  expiresAt: Date           // TTL expiration (30 days)
}
```

**Indexes**:
- `level`: For filtering by severity
- `category`: For filtering by log type
- `timestamp`: For chronological ordering
- `expiresAt`: TTL index (30-day automatic cleanup)

**Categories**:
- `error`, `warning`, `info`
- `relay_failure`, `rate_limit`, `user_blocked`
- `system_health`, `user_action`

**Notes**:
- Streamed to dashboard via WebSocket
- 30-day TTL for automatic cleanup
- Batched HTTP requests for efficiency
- Different from file-based Winston logs
- Used for real-time monitoring

---

### Instance

**File**: `src/models/Instance.js`

**Purpose**: Bot instance tracking for metrics and multi-instance support.

**Schema**:

```javascript
{
  _id: String,              // Instance ID (from env or generated)
  version: String,          // Bot version
  startedAt: Date,          // Instance start time
  lastPing: Date,           // Last heartbeat
  userCount: Number,        // Total registered users
  lobbyCount: Number,       // Users in lobby
  messageCount: Number,     // Total messages relayed
  environment: String       // 'production', 'development', etc.
}
```

**Notes**:
- Used by metrics collection system
- Heartbeat updated periodically
- Helps identify multiple running instances
- Anonymous usage metrics (opt-in via `METRICS_ENABLED`)
- Sent to metrics API daily

---

## Index Summary

### Most Important Indexes

**User Model**:
- `alias` (unique): Fast alias lookups
- `inLobby`: Filter lobby members

**Activity Model**:
- `status`: Filter by online/idle/offline
- `lastActive`: Compliance and inactivity checks

**RelayedMessage Model**:
- `userId + messageId`: Reply threading lookups
- `originalUserId + originalMsgId`: Find all message copies
- `relayedAt`: History queries with time filtering

**QuoteLink Model**:
- `messageId + userId`: Fast reply lookups
- `createdAt` (TTL): 2-minute expiration

**Report Model**:
- `status`: Filter pending/resolved reports
- `reportedUserId`: Find reports about user

**AuditLog Model**:
- `action`: Filter by action type
- `timestamp`: Chronological queries

**Block Model**:
- `blockerId + blockedId` (compound unique): Ensure no duplicates

---

## Migration Notes

When updating schemas:
1. Update model file in `src/models/`
2. Add migration script if needed
3. Update this documentation
4. Test with existing data
5. Document in CHANGELOG.md

For breaking changes:
- Increment MAJOR version
- Provide migration path
- Announce to users
- Keep backup before migration

---

## Performance Considerations

### Batch Operations

Always use batch queries to avoid N+1 problems:
- `User.find({ _id: { $in: userIds } })`
- `Activity.find({ _id: { $in: userIds } })`
- Utility functions: `getAllUserMeta()`, `getAllActivities()`, `getAllAliases()`

### Index Usage

- Ensure queries use indexes (explain() in MongoDB)
- Compound indexes for common query patterns
- TTL indexes for automatic cleanup

### Memory Management

- QuoteLink: 2-minute TTL reduces memory
- BotLog: 30-day TTL for log cleanup
- Activity timers: Cleaned up after offline transition

---

## Related Documentation

- [Command Reference](./COMMANDS.md) - All bot commands
- [Systems Documentation](./SYSTEMS.md) - Feature details
- [Dashboard Documentation](./DASHBOARD.md) - Dashboard/API architecture
