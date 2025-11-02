# Changelog

All notable changes to TG-Lobby-Bot will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

- Initial release of TG-Lobby-Bot
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
