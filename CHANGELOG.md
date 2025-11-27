# Changelog

All notable changes to SecretLoungeBot will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Comprehensive Karma System**
  - New `Karma` transaction model tracking all karma interactions between users
  - Karma tracking fields added to User model (`karma`, `karmaGivenToday`, `lastKarmaReset`)
  - Multiple karma triggers: +1/-1 text, 👍/👎 emojis, positive words (thanks, helpful, great), custom emojis (⭐, ❤️, 🔥)
  - Reply-based karma system - users give karma by replying to messages with triggers
  - Anti-abuse protection with per-user cooldown (24h) and daily limit (10 karma/day)
  - Karma emoji badges displayed next to usernames for high (≥50) and negative (≤-10) karma
  - Karma level tiers: legendary (⭐ 100+), high (🌟 50+), negative (⚠️ -10), very negative (💀 -50)
  - `/karma [user]` command to view detailed karma statistics and leaderboard rank
  - `/karmatop` command showing top 10 users by karma
  - Karma display in user profiles (only shown for significant karma levels)
  - Karma statistics including received/given counts and top givers/recipients
  - 7 new karma-based achievements:
    - Helpful Hand (🤝): Earn 10 karma
    - Community Favorite (🌟): Earn 50 karma
    - Legend (⭐): Earn 100 karma
    - Karma Millionaire (💎): Earn 500 karma
    - Generous Spirit (🎁): Give 25 karma to others
    - Controversial (⚠️): Receive -10 karma (secret)
    - Reformed (✨): Go from -50 to +50 karma (secret)
  - Automatic achievement checking when karma changes
  - Database indexes for efficient karma queries and cooldown checks
  - Karma transaction audit trail for transparency and debugging

## [2.4.0] - 2025-01-14

### Added

- **Comprehensive Achievements System**

  - New `Achievement` model defining 30+ achievements across 6 categories (messaging, social, tenure, milestone, special, role)
  - New `UserAchievement` model tracking unlocked achievements per user
  - Achievement tiers: bronze, silver, gold, platinum, diamond with point values
  - Achievement categories: messaging, social, tenure, milestone, special, role-based
  - Secret achievements that are hidden until unlocked
  - Automatic achievement checking after user actions (message sent, role change, etc.)
  - Achievement notification system with emoji icons and descriptions
  - `achievementService.js` with initialization, awarding, checking, and querying functions
  - 30+ predefined achievements including:
    - Message milestones (1, 10, 100, 500, 1000, 5000 messages)
    - Reply achievements (10, 100, 500 replies)
    - Media achievements (100, 500 media messages)
    - Text achievements (100, 500 text messages)
    - Tenure achievements (1 day, 1 week, 1 month, 3 months, 6 months, 1 year)
    - Leaderboard achievements (top 10, top 3, #1)
    - Special achievements (night owl, early riser, activity streaks)
    - Role achievements (moderator, administrator)
  - Achievement points system for gamification
  - Achievement progress tracking and statistics
  - Automatic initialization of default achievements on startup

- **Enhanced Warnings System**

  - New `Warning` model for granular warning tracking with individual records
  - Each warning now includes: issuer ID, issuer alias, reason, timestamp
  - Warnings stored as separate documents instead of just a counter
  - Database indexes for efficient warning queries by user and timestamp
  - Compound index for user + timestamp for fast sorting
  - `/moderation/warnings/:userId` API endpoint to fetch user warnings
  - `/moderation/warnings/:warningId` DELETE endpoint to remove individual warnings
  - `/moderation/warnings/user/:userId` DELETE endpoint to clear all user warnings
  - New `WarningsDialog` component in dashboard for viewing/managing warnings
  - Warning display in dashboard users table
  - Detailed warning history with moderator alias and reason
  - Individual warning removal with confirmation dialog
  - Clear all warnings with confirmation dialog
  - Warning count badge in user management interface

- **Role Change Notifications**

  - New `roleNotifications.js` utility for user-facing role notifications
  - Automatic Telegram notifications when users receive roles
  - Automatic Telegram notifications when users lose roles
  - Support for system role changes (owner, admin, mod, whitelist)
  - Support for custom role assignments and removals
  - Detailed notifications including role icons, descriptions, and permissions
  - Permission list display for custom role assignments
  - Graceful handling of blocked users (no error thrown)
  - Notification formatting with HTML parsing
  - Role emoji icons in notifications (👑 owner, ⭐ admin, 🛡️ mod, ✅ whitelist)

- **Dashboard Warning Management**
  - Warnings dialog component with table view of all warnings
  - Warning details: date, issuer, reason
  - Remove individual warnings with confirmation
  - Clear all warnings with confirmation
  - Real-time warning count updates after actions
  - Warnings column in users table showing warning count
  - Click warning count badge to open warnings dialog
  - Formatted date display (MMM DD, YYYY HH:MM)
  - Empty state message when user has no warnings

### Changed

- **Enhanced /profile Command**

  - Now displays achievements earned by user
  - Shows total achievement points
  - Displays achievement progress percentage
  - Lists up to 10 most recent achievements with icons
  - Achievement section added to user profile output
  - Better formatting and organization of profile information

- **Improved Moderation Commands**

  - `/warn` command now creates Warning documents instead of just incrementing counter
  - Warning records include issuer alias and reason
  - `/clearwarns` command now removes all Warning documents for user
  - Warning threshold (3 warnings = auto-ban) still works with new system
  - Better audit trail for warnings with individual tracking
  - Moderation service now supports warnings CRUD operations

- **Role Assignment Improvements**

  - `/promote`, `/demote`, `/whitelist` commands now notify users
  - Role changes trigger automatic notifications to affected users
  - Custom role assignments send notifications with permissions list
  - Role removal notifications sent when roles are cleared
  - Better user experience with immediate feedback on role changes
  - Error handling for blocked users in role notifications

- **Dashboard Moderation Enhancements**

  - Moderation controller expanded with warnings endpoints
  - Batch controller updated with warnings support
  - Moderation service includes full warnings CRUD
  - User service enhanced with warnings queries
  - Better separation of concerns for moderation operations
  - Improved error handling in moderation services

- **User Management Updates**

  - Users index now supports Warning model queries
  - User service includes warnings data in user objects
  - Enhanced user details with warnings information
  - Better data consistency between bot and dashboard
  - Warnings integrated into user statistics

- **Relay System Improvements**
  - Edit relay now includes achievement checks
  - Message relay triggers achievement evaluation
  - Better integration of achievement system into core relay flow
  - Achievement notifications sent without blocking message relay

### Fixed

- **Warning System Consistency**

  - Warnings now persistently tracked with full audit trail
  - No more loss of warning context when clearing warnings
  - Better visibility into warning history for moderators
  - Accurate warning counts with database-backed tracking

- **Role Assignment Feedback**

  - Users now immediately know when their roles change
  - No more silent role changes without user notification
  - Clear communication of permission changes
  - Better user awareness of privilege changes

- **Database Schema Issues**
  - Warning model added with proper indexes
  - Achievement and UserAchievement models properly registered
  - Database migrations include new collections
  - Proper compound indexes for efficient queries

## [2.3.0] - 2025-01-07

### Added

- **Comprehensive Documentation System**

  - Complete `docs/` directory with 130KB+ of detailed documentation
  - `docs/COMMANDS.md` - Full reference for 50+ bot commands with examples and parameters
  - `docs/MODELS.md` - Detailed database schemas for all 20+ models with field descriptions
  - `docs/SYSTEMS.md` - In-depth documentation for all bot systems and features (60KB)
  - `docs/DASHBOARD.md` - Complete dashboard architecture, API endpoints, and deployment guide
  - CLAUDE.md updated with references to detailed docs instead of inline documentation
  - Cleaner project structure with separation of concerns

- **In-App Notification System**

  - Full notification infrastructure for dashboard users
  - `Notification` model with type, title, message, priority, read status, and TTL
  - `NotificationPreferences` model for per-user notification settings
  - Notification types: report, moderation, user_action, system, security, announcement
  - Priority levels: low, medium, high, critical
  - `/api/notifications` REST endpoints for fetching, marking read, deleting notifications
  - `/api/notifications/preferences` endpoints for managing notification settings
  - Notification service with automatic cleanup of old notifications (30-day TTL)
  - Dashboard notification center with real-time updates via WebSocket
  - Notification bell icon with unread count badge
  - Per-notification type enable/disable settings
  - Sound and desktop notification preferences

- **Internal Bot-to-Dashboard API**

  - New `/api/internal` routes for bot to trigger dashboard events
  - Internal endpoints for emitting: reports, moderation actions, spam alerts, user join/leave, settings changes, audit logs
  - Secure internal communication channel for real-time event propagation
  - Automatic stats updates triggered by bot events
  - WebSocket emission integration with bot actions

- **System Health Monitoring**

  - System controller and service for monitoring bot health
  - `/api/system/health` endpoint returning bot status, memory, uptime
  - `/api/system/stats` endpoint for comprehensive system statistics
  - Real-time system health metrics via WebSocket
  - Memory usage tracking and reporting

- **Bot Restart Command**

  - `/restart` and `/reload` owner-only commands for restarting bot via PM2
  - Graceful restart with user notification before process reload
  - Fallback to process exit if PM2 reload fails
  - Audit logging for restart operations
  - 2-second delay to ensure notification delivery before restart

- **Database Migration System**

  - New `src/migrations/` directory for database schema migrations
  - `createSystemRoles.js` migration for populating system roles on startup
  - Automatic migration execution during bot initialization
  - Support for future schema changes and data migrations

- **Enhanced User Management**

  - User ban notifications sent via Telegram when user is banned
  - User mute notifications sent via Telegram when user is muted
  - Improved audit logging with moderator alias included
  - Custom roles display in user listings (dashboard and API)
  - Better error handling for user notification failures

- **Dashboard UI Enhancements**
  - New `dashboard/src/app/dashboard/notifications/` page for notification center
  - `dashboard/src/components/common/` directory for reusable UI components
  - `dashboard/src/components/users/` directory for user management components
  - `SystemRoleEditDialog.tsx` component for editing system role properties
  - Improved user table with custom roles display
  - Enhanced permission matrix with visual role indicators
  - Better audit log display with action categories

### Changed

- **Permission System Improvements**

  - Enhanced RBAC middleware with better error handling
  - Permission checks now include custom role validation
  - 5-minute caching for permission checks to reduce database load
  - Permission config now reads from database with fallback to hardcoded defaults
  - Better separation between system roles and custom roles

- **Socket Service Enhancements**

  - Extended WebSocket events for notifications and system health
  - Better connection management with keepalive pings
  - Improved error handling for socket emissions
  - Automatic reconnection support for dashboard clients
  - More granular event types for better real-time updates

- **Service Layer Improvements**

  - User service now includes ban/mute notifications
  - Auth service improved with better token handling
  - Moderation service enhanced with notification creation
  - Stats service optimized with better caching
  - Socket service expanded with more event types

- **Dashboard API Routes**

  - Reorganized route structure for better maintainability
  - New internal routes for bot-to-dashboard communication
  - Notification routes for notification management
  - System routes for health monitoring
  - Better route organization and separation of concerns

- **Link Detection Improvements**

  - Enhanced URL pattern matching
  - Better handling of edge cases in link spam detection
  - Improved performance for link extraction

- **Relay System Updates**
  - Better error context in relay failures
  - Improved logging for debugging relay issues
  - Enhanced media group handling
  - Better tracking of relay statistics

### Fixed

- **Audit Log Schema Consistency**

  - Standardized audit log field names across all services
  - Changed `category` to `action` for consistency
  - Changed `details` to `reason` for better clarity
  - Changed `metadata` to `details` for additional context
  - All audit log entries now include moderator alias

- **Dashboard Request Format Mismatches**

  - Fixed inconsistent request/response formats between frontend and API
  - Standardized API response structures
  - Better error response formatting

- **Tab Persistence Issues**

  - Fixed settings page tab persistence after saving
  - Applied tab persistence fix to all dashboard pages with tabs
  - Better state management for tabbed interfaces

- **Socket Connection Issues**
  - Improved WebSocket connection reliability
  - Better handling of connection drops
  - Enhanced reconnection logic

## [2.2.0] - 2025-01-06

### Added

- **Editable Standard Roles with Visual Badges**
  - System roles (Admin, Mod, Whitelist, Regular) now stored in database and fully editable
  - Customizable role emojis displayed after user alias in chat messages
  - Emoji-only badges for privileged roles (owner 🔱, admin 👑, mod 🛡️, whitelist ⭐)
  - Role emoji picker in dashboard with common emojis and custom emoji support
  - System Role Edit Dialog for managing emoji, color, permissions, and descriptions
  - Owner role protected from modifications for security
  - Real-time permission updates with 5-minute caching
  - Role badges visible in dashboard permission matrix and user management pages
  - Automatic migration on startup to populate system roles with default values
  - `SystemRole` model for database-stored role configuration
  - Database-backed permission system with fallback to hardcoded defaults
  - Visual role indicators throughout dashboard UI

### Changed

- Permission system now reads from database instead of hardcoded config
- System roles (except Owner) can now be edited through dashboard
- Message relay headers now include role emoji badges for privileged users
- Dashboard permissions page allows editing system role properties
- Role permissions cached for 5 minutes to minimize database queries
- Permission matrix displays role emojis in column headers

## [2.1.0] - 2025-11-05

### Added

- **Blocked User Detection & Management System**

  - Automatic detection when users block the bot (403 Forbidden errors)
  - `blockedBot` and `blockedAt` fields added to User model
  - Automatic lobby removal when user blocks the bot
  - `/blocked` admin command to view all users who have blocked the bot
  - `/blocked cleanup` command to remove blocked users from database
  - Blocked users tracked with date and lobby status
  - Real-time notifications to dashboard when users block bot

- **Dashboard Live Logging System**

  - New WebSocket event types: `bot:log`, `bot:error`, `relay:failure`, `user:blocked`, `system:health`
  - Dashboard API logging endpoint `/api/logs/event` for bot-to-dashboard communication
  - `BotLog` model with TTL (30-day auto-expiration)
  - Dashboard logger bridge service with batched HTTP requests
  - Real-time error streaming to dashboard with severity levels
  - System health metrics logging (memory, uptime, throughput)
  - Event categorization: error, warning, info, relay_failure, rate_limit, user_blocked, system_health, user_action
  - Automatic log cleanup with configurable retention period

- **Message Length Handling**

  - Message splitter utility for handling Telegram's 4096 character limit
  - `splitLongMessage()` function with smart word boundary detection
  - `sendLongMessage()` wrapper for automatic message splitting
  - Part indicators (e.g., "[Part 1/3]") for split messages
  - Configurable safety margin (4000 chars) to account for formatting

- **Centralized Error Handling**
  - `telegramErrorHandler.js` utility for consistent error handling
  - Automatic detection of blocked user errors, rate limits, message too long, not found errors
  - `handleTelegramError()` function for unified error processing
  - `safeTelegramCall()` wrapper for protected API calls
  - Error categorization with appropriate dashboard logging

### Changed

- **Enhanced Delete Command Feedback**

  - Detailed deletion statistics: successful, blocked, not found, other errors
  - Per-user error tracking during message deletion
  - Admin receives comprehensive report of deletion outcomes
  - Improved notification error handling

- **Improved Relay Error Handling**

  - `standardMessage.js` now uses centralized error handler
  - `editRelay.js` now tracks and reports blocked users
  - All relay failures logged to dashboard with context
  - Better error context (senderId, alias, messageType, etc.)

- **Main Error Handler Integration**
  - Bot errors now logged to both Telegram (admin) and dashboard
  - Graceful shutdown with log flushing on SIGINT/SIGTERM
  - Error aggregation tracked and reported to dashboard
  - Critical errors marked with priority flag

### Fixed

- **Unhandled Promise Rejections**

  - Fixed "message is too long" unhandled rejections
  - Improved error catching in relay loops
  - Better async error handling in delete/announce/pins commands

- **Silent Blocking Failures**
  - Bot now detects and handles 403 Forbidden errors properly
  - Blocked users automatically removed from lobby
  - No more silent failures in message relay

## [2.0.0] - 2025-11-03

### Added

- **Anti-Spam Detection System** with automatic violation tracking and escalating mutes
- New `SpamDetection` model with violation counters and auto-mute state
- Spam handler with three detection types: flood, link spam, and rapid-fire
- Flood detection: identifies repeated identical/similar messages (85% similarity threshold)
- Link spam detection: monitors excessive links and suspicious URLs
- Rapid-fire detection: prevents burst messaging (10+ messages per minute)
- Automatic temporary mute escalation: 5m → 15m → 1h → 24h → 7d
- `/antispam` command for viewing configuration and statistics
- `/antispam config` to view all configurable options
- `/antispam set <option> <value>` to update spam detection settings
- `/antispam whitelist <alias>` to exempt users from spam checks
- `/antispam unwhitelist <alias>` to remove spam check exemption
- `/antispam reset <alias>` to reset user's violation count
- `/antispam clear <alias>` to manually clear auto-mute
- `/antispam top` to view top 10 spammers by violation count
- Configurable thresholds for all spam detection types
- Periodic cleanup of expired auto-mutes (every 5 minutes)
- Levenshtein distance algorithm for message similarity detection
- URL extraction and pattern matching for suspicious links
- Admins, mods, and whitelisted users are exempt from all spam checks
- Spam configuration stored in global Setting document
- Integrated spam checks into relay handler before message distribution
- User-friendly violation messages with remaining mute time
- **Comprehensive Audit Log System** for all moderation actions
- New `AuditLog` model with indexed queries for performance
- Persistent database logging for all 41 moderation action types
- `/auditlog` or `/audit` command for admins and mods to view moderation history
- Pagination support for audit log (20 entries per page)
- Filter audit log by action type (e.g., `/auditlog ban`)
- Filter audit log by target user (e.g., `/auditlog user Alice`)
- Filter audit log by moderator (e.g., `/auditlog mod Bob`)
- Automatic logging for ban/unban operations (single and bulk)
- Automatic logging for mute/unmute operations (single and bulk)
- Automatic logging for kick operations (single and bulk)
- Automatic logging for media restrictions (restrict/unrestrict)
- Automatic logging for role changes (promote, demote)
- Automatic logging for whitelist additions
- Automatic logging for warnings issued and cleared
- Automatic logging for auto-ban events (3 warnings)
- Automatic logging for cooldown applications
- Automatic logging for content filter management (add, remove, toggle)
- Automatic logging for slowmode configuration (enable, disable)
- Automatic logging for lobby rules management (add, remove, clear)
- Automatic logging for invite system operations (mode toggle, create, revoke, activate, delete)
- Automatic logging for report resolutions and dismissals
- Metadata capture: moderator alias and target alias at time of action
- Indexed queries by moderatorId, targetUserId, action, and timestamp
- Permanent retention of audit logs for complete historical record
- **Comprehensive Statistics Dashboard** for lobby insights
- `/stats` or `/statistics` command for overall lobby statistics
- User metrics: total registered, in lobby, active now, participation percentage
- Message metrics: total, daily/weekly/monthly counts, text vs media breakdown
- Activity insights: top 5 contributors, engagement levels
- Moderation summary: action counts from audit log (last 30 days)
- `/stats user <alias>` - User-specific activity and moderation history
- User profile stats: status, role, join date, tenure, last activity
- User message stats: total, text, media, replies, messages relayed
- User moderation history: warnings, times moderated, current restrictions
- `/stats period <day|week|month>` - Time-based activity analysis
- Period shortcuts: `/stats day`, `/stats week`, `/stats month`
- Period metrics: messages, new users, moderation actions, top contributors
- **Performance optimizations**: 5-minute cache with TTL for expensive queries
- Parallel query execution for fast stats retrieval
- MongoDB aggregation pipelines for efficient data processing
- Top contributor rankings across different timeframes
- Real-time activity status (online/idle users)
- Text vs media message percentage calculations
- Growth trend indicators
- **Scheduled Announcements System** for automated community messaging
- New `ScheduledAnnouncement` model with one-time and recurring schedules
- `/schedule` command for creating and managing scheduled announcements
- One-time announcements with flexible time parsing (1h, 30m, 2d, 14:30, tomorrow, etc.)
- Recurring announcements with cron patterns and convenient presets
- 9 built-in schedule presets (daily-9am, daily-12pm, weekly-monday, hourly, etc.)
- Custom cron pattern support (minute hour day month weekday format)
- `/schedule create once <time> <message>` - Schedule one-time announcement
- `/schedule create recurring <preset|pattern> <message>` - Schedule recurring announcement
- `/schedule list` - View all scheduled announcements with status
- `/schedule view <id>` - View detailed announcement information
- `/schedule pause <id>` - Temporarily disable announcement
- `/schedule resume <id>` - Re-enable paused announcement
- `/schedule delete <id>` - Permanently remove announcement
- `/schedule test <id>` - Preview announcement before it goes live
- Flexible targeting: send to all users or lobby members only (--all flag)
- Private notes support for admin reference (--notes flag)
- Automatic one-time announcement checking every minute
- Node-cron integration for efficient recurring announcements
- Recurring announcements re-initialized on bot startup
- Hourly re-scan for newly created recurring announcements
- Send history tracking (count and last sent timestamp)
- Automatic deactivation of one-time announcements after sending
- 100ms delay between recipients to avoid rate limits
- Timezone configuration support (defaults to Europe/Berlin)
- Complete audit trail for all schedule operations (create, pause, resume, delete, send)
- Persistent storage in MongoDB with indexed queries
- Command aliases: `/schedules`, `/scheduled`
- **Welcome Message System** for automated new member onboarding
- `/welcome` command for enabling, disabling, and customizing welcome messages
- `/welcome on [message]` - Enable welcome messages with optional custom text
- `/welcome off` - Disable automatic welcome messages
- `/welcome set <message>` - Update welcome message without toggling
- `/welcome status` - View current configuration and message preview
- Automatic welcome message delivery when users successfully join lobby
- Welcome messages appear after pinned messages (if any)
- Customizable message content to suit community needs
- Default welcome message guides new users to `/help` and basic commands
- Welcome configuration stored in global Setting document
- Complete audit trail for welcome message operations (enable, disable, update)
- Graceful error handling ensures welcome message failures don't interrupt join flow
- **Message Search System** for finding past conversations and information
- `/search <query>` or `/find <query>` - Search your own message history
- Privacy-focused: users can only search messages they sent
- Case-insensitive regex search with automatic special character escaping
- Query validation (2-100 characters) for performance and safety
- Rich result display with type emoji, timestamp, and message preview
- Search term highlighting with bold/underline formatting in results
- Searches text messages and media captions across all message types
- Result deduplication groups by original message to avoid duplicates
- Limit to 50 database results, displays top 20 most recent matches
- Fast indexed queries on RelayedMessage collection for performance
- Comprehensive error messages and usage guidance
- Command execution logged for analytics
- **Backup/Export System** for data portability and GDPR compliance
- `/export` command for exporting bot data in JSON format
- `/export users` - Export all user data including profiles, activity, and preferences
- `/export messages [days]` - Export message history with optional time filtering
- `/export full [days]` - Complete system backup with all data
- `/export user <alias>` - GDPR-compliant export of specific user's complete data
- User data exports include: profiles, activity metrics, preferences, blocked users count
- Message exports include: metadata, captions, album IDs, recipient counts, message types
- Full backup includes: users, messages, reports, polls, audit logs, pins, reactions, schedules, settings
- GDPR user exports: personal data, activity, preferences, blocked user IDs, messages sent, reports, polls, moderation history
- JSON export format with type, date, time range, and structured data
- Exports delivered as document attachments with file size and generation time
- Time-filtered message exports (e.g., last 7 days, last 30 days)
- Admin-only access with complete audit trail logging
- 4 audit log action types: export_users, export_messages, export_full, export_user
- Performance optimizations: parallel queries, batch operations, indexed lookups
- Privacy protection: blocked user IDs only in GDPR exports, counts in general exports
- Command alias: `/backup` for `/export`
- Native `message_reaction` event handler in relayHandler
- Automatic reaction propagation across all relayed message copies
- Support for Telegram's full reaction set (not limited to 5 emojis)
- Native pin/unpin functionality across all lobby members
- Hybrid pin system supporting both announcements and relayed messages

### Changed

- Message reactions now use Telegram's built-in reaction system for better UX
- Reactions are automatically relayed across all copies of a message
- Users can react using native Telegram UI (long-press on message)
- **Pin system overhauled** to support native Telegram pins
- `/pin` command now supports two modes:
  - Reply to a message with `/pin` - pins that specific relayed message in all chats
  - `/pin <text>` - creates and pins a new announcement in all chats
- Pins now actually appear at the top of users' chats (native Telegram pins)
- `/unpin` command now unpins messages from all users' chats
- `/pinned` command displays both announcement pins and relayed message pins
- PinnedMessage model extended with `type`, `relayedMessageIds`, `originalUserId`, `originalMsgId`
- Enhanced `logger.logModeration()` to create database audit entries
- Updated all moderation commands to use correct logger parameter order
- Fixed parameter order in existing ban, mute, and kick logging calls
- Bulk operations now log correctly with null targetUser and details array

### Removed

- Custom reaction inline keyboard buttons (replaced with native reactions)
- Reaction model and database tracking (no longer needed)
- `src/relay/reactions.js` (reaction keyboard generation)
- Callback query handler for reaction buttons
- Follow-up reaction keyboard messages for media groups

### Fixed

- Reactions no longer require database storage or custom UI maintenance
- Pin system is now more intuitive and matches Telegram's native behavior

## [1.9.0] - 2025-11-02

### Added

- Version command showing bot version, uptime, and changelog link
- `/version` or `/v` - Display current bot version and uptime information
- Anonymous metrics collection system for tracking bot adoption
- Daily metrics reporting (instance ID, version, user counts) sent to API
- Instance model for persistent instance identification
- Runtime state tracking for bot uptime calculations
- Optional metrics configuration via environment variables (METRICS_ENABLED, METRICS_API_URL, INSTANCE_ID)
- Automatic instance ID generation using cryptographically secure UUIDs
- Retry logic with exponential backoff for metrics API submissions
- Silent failure for metrics (errors logged but don't crash bot)

### Changed

- Environment configuration now supports optional anonymous metrics settings
- Daily midnight scheduler now includes metrics submission (if enabled)

## [1.8.0] - 2025-11-02

### Added

- Bulk moderation actions for admin efficiency
- `/ban <alias1> <alias2> <alias3> [duration]` - Ban multiple users at once with confirmation prompt
- `/unban <alias1> <alias2> <alias3>` - Unban multiple users at once
- `/mute <alias1> <alias2> <alias3> [duration]` - Mute multiple users at once with confirmation prompt
- `/unmute <alias1> <alias2> <alias3>` - Unmute multiple users at once
- `/kick <alias1> <alias2> <alias3>` - Kick multiple users from lobby with confirmation prompt
- Interactive confirmation dialogs for bulk operations (2+ users)
- Single-user operations execute immediately without confirmation
- Comprehensive error reporting showing which users succeeded/failed
- 1-minute expiry on confirmation prompts for security
- Automatic cleanup of expired confirmation requests

### Changed

- Ban, mute, and kick commands now support multiple space-separated aliases
- Updated command descriptions and usage text to reflect bulk support
- Duration parsing improved to detect common patterns (7d, 1h, 30m)
- Confirmation prompts only appear for bulk operations (2+ users)
- All bulk moderation actions logged via structured logger

### Fixed

- Batch user resolution prevents N+1 query issues with bulk operations
- Proper error handling for partial failures in bulk operations
- Admin-only confirmation (prevents other admins from confirming someone else's bulk action)

## [1.7.0] - 2025-11-02

### Added

- Comprehensive help system with categorized command reference
- `/help` - Main help overview with quick start guide
- `/help user` - All user commands organized by category
- `/help mod` - Moderator commands (visible only to mods/admins)
- `/help admin` - Admin commands (visible only to admins)
- `/help <command>` - Detailed help for specific commands with usage examples
- Role-based help access control (mods/admins see additional categories)
- 8 command categories: Identity, Lobby, Messaging, Privacy, Community, Account, Moderation, Administration
- Complete command database with 50+ commands documented
- Usage examples for every command
- Command aliases displayed in help output
- Permission-based filtering (users can't see mod/admin commands they can't use)

### Changed

- Help system now provides detailed, categorized information instead of simple list
- Help command supports multiple modes for different user roles
- Improved command discoverability with category-based organization

## [1.6.0] - 2025-11-02

### Added

- User-level blocking system for privacy and harassment prevention
- `/block <alias|reply>` command to block users (private, blocked user not notified)
- `/unblock <alias|reply>` command to unblock users
- `/blocklist` command to view all blocked users
- Block model with optimized indexes for performance
- Blocked users' messages are automatically filtered from relay
- Batch query optimization to prevent N+1 queries when checking blocks
- Support for both alias-based and reply-based blocking

### Changed

- Message relay now filters out users who have blocked the sender
- Media group relay now filters out users who have blocked the sender
- Blocking is completely private - blocked users receive no notification

## [1.5.0] - 2025-11-02

### Added

- Structured logging system using Winston logger
- Configurable log levels (debug, info, warn, error)
- Log rotation with 10MB max file size, keeping last 5 files
- Separate log files for errors, exceptions, and rejections
- Shared time formatting utilities (formatTimeAgo, formatTimeRemaining, formatDuration)
- Additional database indexes for improved query performance:
  - Activity: compound index on (userId, status) for user-specific status queries
  - Poll: compound index on (creatorId, isActive, createdAt) for finding user's polls
  - RelayedMessage: indexes on relayedAt and (originalUserId, relayedAt) for history queries
  - User: compound indexes for lobby queries, moderation queries (bannedUntil, mutedUntil)
- Helper logging methods: logCommand(), logRelay(), logModeration(), logError(), logAuth()

### Changed

- Replaced all console.log/error/warn calls with structured logger in core files
- Consolidated duplicate time formatting functions into shared utilities
- Enhanced database query performance with optimized indexes
- Log files now stored in logs/ directory with automatic rotation

### Fixed

- Removed code duplication in time formatting across multiple command files
- Improved database performance for common query patterns

## [1.4.0] - 2025-10-31

### Added

- Chat history system allowing lobby members to view last 50 messages from past 12 hours
- `/history` command with support for all message types (text, media, albums)
- Efficient message deduplication and chronological ordering in history retrieval
- Batch sender information fetching for improved history performance
- Automatic database cleanup with TTL index on RelayedMessage for automatic expiration
- Scheduled cleanup jobs for old reports (>90 days) and closed polls (>30 days)
- Cleanup task runs daily at midnight with logging
- Pagination system with reusable utility functions
- Interactive pagination with Previous/Next buttons and page indicators
- Pagination for `/reports` command (10 reports per page)
- Pagination for `/filter list` command (10 filters per page)
- Pagination for `/invite_list` command (10 invites per page)
- Pagination footer showing current page and total items

### Changed

- `/reports` command now displays paginated results instead of limiting to 20
- `/filter list` command now supports pagination for large filter sets
- `/invite_list` command now supports pagination for large invite lists
- All paginated lists use inline keyboard navigation for better UX

### Fixed

- RelayedMessage documents now properly expire from database based on expiresAt field
- Admin list commands no longer hit Telegram message length limits with large datasets
- Old reports and polls no longer accumulate indefinitely in database

## [1.3.0] - 2025-10-31

### Added

- Chat history system allowing lobby members to view last 50 messages from past 12 hours
- `/history` command with support for all message types (text, media, albums)
- Efficient message deduplication and chronological ordering in history retrieval
- Batch sender information fetching for improved history performance

### Changed

- History messages reconstruct original formatting with icon and alias headers
- Media history uses stored Telegram file_ids for efficient re-sending

## [1.2.0] - 2025-10-XX

### Added

- Poll creation and voting system with `/poll` and `/endpoll` commands
- Anonymous voting with real-time vote count updates
- Visual progress bars when polls are closed
- Content filter system for blocking messages matching keywords or regex patterns
- `/filter add/list/remove/toggle` admin commands for filter management
- Slowmode system with configurable delay between messages (1-3600 seconds)
- `/slowmode` admin commands with role-based exemptions
- User profile system with `/profile` command showing detailed stats
- Leaderboard system with `/leaderboard` (daily/weekly/alltime rankings)
- `/tenure` command to view lobby membership duration and milestones
- Achievement badges for message milestones and tenure
- Extended activity tracking: totalMessages, totalReplies, totalTextMessages, totalMediaMessages
- Edit relay system - edited messages update across all recipients
- Report system for users to report problematic messages to moderators
- `/report` command for users, `/reports`, `/viewreport`, `/resolve` for moderators

### Changed

- Improved media group buffering from 900ms to 1.5s for better reliability
- Enhanced rate limit handling with exponential backoff and automatic retries
- Media group buffer cleanup extended from 8s to 20s to prevent race conditions
- Activity tracking now includes reply detection for better statistics

### Fixed

- Reply threading now properly degrades when target message is unavailable
- Album captions now correctly appear on first item only
- sendWithRetry() handles HTTP 429 rate limits with retry_after delay
- Automatic fallback for bad reply targets (HTTP 400 errors)

## [1.1.0] - 2025-10-XX

### Added

- Invite-only mode with global toggle
- Invite code generation and management system
- `/invite_on`, `/invite_off`, `/invite_new`, `/invite_list`, `/invite_revoke`, `/invite_activate`, `/invite_delete` admin commands
- Invite codes with configurable max uses and expiry dates
- Automatic user registration on `/join` if user doesn't exist
- Rules system with `/rules_add`, `/rules_remove`, `/rules_clear`, `/rules_list` admin commands
- Role-based permission system (admin, mod, whitelist)
- `/promote` and `/demote` admin commands for role management
- Whitelist role with `/whitelist` command for moderators
- Media restriction system with `/restrictmedia` and `/unrestrictmedia` commands
- Debug commands for media tracking: `/debugmedia`, `/debuglist`, `/debugcopy`

### Changed

- Switched from JSON files to MongoDB for all data persistence
- Improved compliance check performance with batch queries
- User model now uses named export instead of default export
- Enhanced error logging across all catch blocks
- Centralized command registration system with auto-discovery

### Fixed

- Fixed compliance system to check all rules instead of stopping at first violation
- Removed incomplete multi-lobby feature to prevent startup crashes
- Fixed activity timers cleanup after offline transition

## [1.0.0] - 2025-10-XX

### Added

- Initial release of SecretLoungeBot
- Anonymous chat lobby system with user registration
- User alias and custom emoji icon support
- Message relay system for text and media (photo, video, audio, document, sticker, voice, animation)
- Media group/album support with proper buffering and ordering
- Reply threading across relayed messages
- QuoteLink system with 2-minute TTL for fast reply lookups
- Persistent RelayedMessage model for reply threading fallback
- User activity tracking (online/idle/offline status)
- Status announcements when users come online/go offline
- Compliance system with three rules:
  - First 24 hours: must send 10 media items
  - Daily requirement: must send 1 media item per day
  - Inactivity: auto-kick after 2 days
- Warning system (3 warnings = permanent ban)
- User moderation commands: `/ban`, `/unban`, `/mute`, `/unmute`, `/kick`, `/warn`, `/clearwarns`
- User info commands: `/whois`, `/userinfo`
- Admin announcement system: `/announce`, `/announce_lobby`, `/announce_all`
- Dangerous admin commands: `/nuke`, `/purge` with confirmation system
- Basic user commands: `/start`, `/help`, `/register`, `/join`, `/leave`, `/alias`, `/icon`
- Direct messaging: `/msg`, `/dm` for admin → user communication
- Message signing: `/sign`, `/s` to sign messages with Telegram username
- MongoDB integration with mongoose
- Environment variable validation on startup
- Global error handling with admin crash notifications
- Rate limit handling with sendWithRetry utility
- HTML and MarkdownV2 escaping utilities
- Custom emoji support with fallback for non-premium users
- Graceful shutdown handlers (SIGINT/SIGTERM)
- 24-hour message retention (7 days for warned/banned users)
- TTL-based automatic message deletion from database
- Batch operations for online status and compliance checks
- Status announcement cache with periodic cleanup

### Security

- Input validation for aliases (2-32 characters, alphanumeric + limited special chars)
- HTML escaping for user content to prevent injection attacks
- MarkdownV2 escaping for status announcements
- @ mention blocking (except via `/s` command)
- Environment variable validation to prevent missing credentials
