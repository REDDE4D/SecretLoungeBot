# Command Reference

Complete reference for all bot commands organized by category and access level.

## Table of Contents

- [User Commands](#user-commands)
- [Moderator Commands](#moderator-commands)
- [Admin Commands](#admin-commands)
- [Command Aliases](#command-aliases)

---

## User Commands

### Registration & Lobby

#### `/start`
Start interaction with the bot.
- **Aliases**: None
- **Usage**: `/start [login_<token>]`
- **Optional parameter**: `login_<token>` for dashboard authentication
- **Description**: Initial bot greeting and instructions. With login token, generates QR code for dashboard authentication.

#### `/register <alias>`
Register a new anonymous alias.
- **Usage**: `/register MyUsername`
- **Requirements**:
  - 2-32 characters
  - Alphanumeric + spaces, hyphens, underscores, apostrophes, periods
  - Must be unique
- **Description**: Creates your anonymous identity. Required before joining lobby.

#### `/join [invite_code]`
Join the lobby.
- **Usage**: `/join` or `/join CODE123`
- **Requirements**: Must be registered
- **Description**: Enter the anonymous chat lobby. If invite-only mode is enabled, requires valid invite code.

#### `/leave`
Leave the lobby.
- **Usage**: `/leave`
- **Description**: Exit the lobby. Your alias remains registered but messages stop relaying.

### Profile & Identity

#### `/alias <new_alias>`
Change your anonymous alias.
- **Usage**: `/alias NewName`
- **Requirements**: Same as registration requirements
- **Description**: Update your display name. New alias must be unique.

#### `/icon`
Customize your emoji icon.
- **Aliases**: `/avatar`
- **Usage**: `/icon` (interactive menu)
- **Description**: Choose from preset emojis or use custom emoji ID (Telegram Premium).

#### `/profile [alias]`
View user profile and statistics.
- **Usage**: `/profile` or `/profile SomeUser`
- **Description**: Shows join date, tenure, message counts, achievements, rank. Moderators/admins see additional moderation info.

#### `/tenure`
View your lobby membership duration.
- **Usage**: `/tenure`
- **Description**: Shows how long you've been a lobby member with milestone tracking.

#### `/myperms`
View your personal permissions.
- **Usage**: `/myperms`
- **Description**: Lists all your active permissions including role-based and custom permissions.

### Karma & Social

#### `/karma [alias|reply]`
View karma statistics and leaderboard rank.
- **Usage**: `/karma` or `/karma SomeUser` or reply to a message with `/karma`
- **Description**: Shows detailed karma statistics including:
  - Current karma points and level
  - Leaderboard rank
  - Karma received/given counts
  - Top karma givers and recipients
  - Daily remaining karma to give (10 per day)
- **How to give karma**: Reply to any message with:
  - Text triggers: `+1`, `-1`, `++`, `--`
  - Emoji triggers: 👍, 👎, ⬆️, ⬇️
  - Positive words: `thanks`, `helpful`, `great`, `awesome`, `amazing`, `excellent`, `perfect`, `thank you`, `thx`, `ty`
  - Custom emojis: ⭐, 🌟, ❤️, 💖, 🔥, ✨
- **Limits**:
  - Per-user cooldown: 24 hours (can give karma to same person once per day)
  - Daily limit: 10 karma points total per day
- **Karma badges**: Users with high karma (≥50) or negative karma (≤-10) display emoji badges next to their name:
  - ⭐ Legendary (100+)
  - 🌟 High (50-99)
  - ⚠️ Negative (-10 to -49)
  - 💀 Very Negative (-50 or below)

#### `/karmatop`
View karma leaderboard.
- **Usage**: `/karmatop`
- **Description**: Shows top 10 users by karma with medals (🥇🥈🥉) for top 3 and karma badges for high achievers.

### Communication

#### `/s <alias> <message>` or `/send`
Send direct message to specific user (mentions them in relay).
- **Aliases**: `/send`
- **Usage**: `/s John Hey there!`
- **Description**: Mentions a specific user in your message. User is highlighted via @ mention.

#### `/poll <question> | <option1> | <option2> | ...`
Create a poll.
- **Usage**: `/poll What's your favorite color? | Red | Blue | Green`
- **Requirements**:
  - 2-6 options
  - Options separated by `|`
- **Description**: Creates anonymous poll. Anyone can vote once (can change vote). Use inline buttons to vote.

#### `/endpoll`
Close your most recent active poll.
- **Usage**: `/endpoll`
- **Description**: Closes poll and displays final results with progress bars.

#### `/report [reason]`
Report a message to moderators (reply to message).
- **Usage**: Reply to a message with `/report Spam` or `/report`
- **Description**: Reports problematic message to all moderators/admins. Include optional reason for context.

### Personal Preferences

#### `/preferences` or `/prefs` or `/settings`
Manage your personal preferences.
- **Aliases**: `/prefs`, `/settings`
- **Usage**: `/preferences` (shows menu) or `/preferences set <option> <value>`
- **Options**:
  - `hideStatusAnnouncements` - Hide online/idle/offline announcements (true/false)
  - `compactMode` - Compact message formatting (true/false)
  - `hideJoinLeaveAnnouncements` - Hide join/leave announcements (true/false)
  - `notificationPreference` - Notification level (all/mentions_only/none)
- **Example**: `/preferences set compactMode true`

#### `/compact`
Quick toggle for compact mode.
- **Usage**: `/compact`
- **Description**: Toggles compact message formatting on/off.

#### `/quiet`
Quick toggle for quiet mode (hides status announcements).
- **Usage**: `/quiet`
- **Description**: Toggles hiding of online/idle/offline announcements.

### Blocking

#### `/block <alias>` or reply
Block a user to hide their messages.
- **Usage**: `/block SomeUser` or reply to their message with `/block`
- **Description**: Blocks user. Their messages won't appear in your relay. Personal setting, doesn't affect others.

#### `/unblock <alias>` or reply
Unblock a previously blocked user.
- **Usage**: `/unblock SomeUser` or reply to their message with `/unblock`
- **Description**: Removes block. User's messages will appear again.

#### `/blocklist`
View your list of blocked users.
- **Usage**: `/blocklist`
- **Description**: Shows all users you've blocked with block date and options to unblock.

### Information & Discovery

#### `/history`
View recent chat history.
- **Usage**: `/history`
- **Description**: Retrieves and resends last 50 messages from past 12 hours. Includes all message types and media.

#### `/search <query>` or `/find`
Search your own sent messages.
- **Aliases**: `/find`
- **Usage**: `/search hello world`
- **Description**: Case-insensitive regex search through your message history. Returns last 50 matches with timestamps and previews. Only searches YOUR messages.

#### `/leaderboard [timeframe]`
View most active users.
- **Aliases**: `/top`, `/lb`
- **Usage**: `/leaderboard`, `/leaderboard daily`, `/leaderboard weekly`, `/leaderboard alltime`
- **Timeframes**: `daily`, `weekly`, `alltime` (default: alltime)
- **Description**: Shows top 10 active users ranked by message count.

#### `/pinned`
View all pinned messages.
- **Usage**: `/pinned`
- **Description**: Lists all active pinned messages with IDs and dates. Shows announcement text or "Pinned lobby message" for relayed pins.

#### `/rules`
View lobby rules.
- **Usage**: `/rules`
- **Description**: Displays current lobby rules set by admins.

#### `/help`
Get help and command list.
- **Usage**: `/help`
- **Description**: Shows available commands and bot information.

---

## Moderator Commands

Require moderator or admin role.

### User Information

#### `/info <alias>`
View detailed user information.
- **Usage**: `/info SomeUser`
- **Description**: Shows comprehensive user details including status, roles, restrictions, warnings, activity stats, and moderation history.

### Moderation Actions

#### `/cooldown <alias> <duration>`
Apply temporary mute.
- **Usage**: `/cooldown SomeUser 30m` or `/cooldown SomeUser 2h`
- **Duration formats**: `5m`, `1h`, `2d`, etc.
- **Description**: Temporarily mutes user for specified duration. Lighter alternative to permanent mute.

#### `/reports`
List all pending reports.
- **Usage**: `/reports`
- **Description**: Shows all unresolved user reports with IDs, reporter, reported user, and reason.

#### `/viewreport <id>`
View detailed report information.
- **Usage**: `/viewreport 12345`
- **Description**: Shows full report details including message preview, context, and timestamps.

#### `/resolve <id> <action> [notes]`
Resolve a user report.
- **Usage**: `/resolve 12345 warned Inappropriate content` or `/resolve 12345 none False report`
- **Actions**: `none`, `warned`, `muted`, `banned`, `kicked`, `media_restricted`
- **Description**: Closes report with specified action. Reporter is notified of resolution. Optional notes for context.

---

## Admin Commands

Require admin role only.

### User Management

#### `/promote <alias>`
**[DEPRECATED]** Promote user to moderator.
- **Usage**: `/promote SomeUser`
- **Status**: Deprecated - Use custom roles system instead
- **Description**: Grants moderator privileges.

#### `/demote <alias>`
**[DEPRECATED]** Demote user from moderator.
- **Usage**: `/demote SomeUser`
- **Status**: Deprecated - Use custom roles system instead
- **Description**: Removes moderator privileges.

#### `/whitelist <alias>`
Add user to whitelist.
- **Usage**: `/whitelist SomeUser`
- **Description**: Exempts user from slowmode, content filters, compliance checks, and spam detection.

#### `/unwhitelist <alias>`
Remove user from whitelist.
- **Usage**: `/unwhitelist SomeUser`
- **Description**: Removes whitelist exemptions.

#### `/mute <alias> [duration]`
Mute a user.
- **Usage**: `/mute SomeUser` or `/mute SomeUser 24h`
- **Duration formats**: `30m`, `2h`, `7d`, or permanent if omitted
- **Description**: Prevents user from sending messages. Temporary or permanent.

#### `/unmute <alias>`
Unmute a previously muted user.
- **Usage**: `/unmute SomeUser`
- **Description**: Restores user's ability to send messages.

#### `/ban <alias> [duration]`
Ban a user from the lobby.
- **Usage**: `/ban SomeUser` or `/ban SomeUser 7d`
- **Duration formats**: `1d`, `7d`, `30d`, or permanent if omitted
- **Description**: Removes user from lobby and prevents rejoining. Temporary or permanent.

#### `/unban <alias>`
Unban a previously banned user.
- **Usage**: `/unban SomeUser`
- **Description**: Removes ban, allowing user to rejoin lobby.

#### `/kick <alias> [reason]`
Kick user from lobby.
- **Usage**: `/kick SomeUser Inactivity`
- **Description**: Removes user from lobby but doesn't ban. User can rejoin immediately.

#### `/warn <alias> [reason]`
Issue warning to user.
- **Usage**: `/warn SomeUser Please follow rules`
- **Description**: Adds warning to user record. 3 warnings = automatic permanent ban.

#### `/mediarestrict <alias>`
Restrict user from sending media.
- **Usage**: `/mediarestrict SomeUser`
- **Description**: Allows only text messages, blocks all media types.

#### `/mediaunrestrict <alias>`
Remove media restriction.
- **Usage**: `/mediaunrestrict SomeUser`
- **Description**: Restores ability to send media.

### Message Management

#### `/delete`
Delete a relayed message from all chats (reply to message).
- **Usage**: Reply to a message with `/delete`
- **Description**: Deletes the message from all lobby members' chats. Provides detailed statistics on success/failure.

#### `/pin` or `/pin <text>`
Pin a message or create announcement.
- **Usage**: Reply to message with `/pin` OR `/pin Important announcement text`
- **Description**:
  - **Reply mode**: Pins that specific relayed message across all chats
  - **Text mode**: Creates and pins new announcement across all chats
- **Limit**: Maximum 5 pinned messages

#### `/unpin <id>`
Unpin a pinned message.
- **Usage**: `/unpin 12345`
- **Description**: Unpins message from all chats and removes from database. Get ID from `/pinned` command.

### Communication

#### `/announce_lobby <message>`
Send announcement to lobby members.
- **Usage**: `/announce_lobby Server maintenance in 1 hour`
- **Description**: Sends message to all users currently in lobby. Supports HTML formatting.

#### `/announce_all <message>`
Send announcement to all registered users.
- **Usage**: `/announce_all Important bot update!`
- **Description**: Sends message to ALL registered users (in lobby or not). Use for critical updates. Supports HTML formatting.

### Scheduled Announcements

#### `/schedule list`
List all scheduled announcements.
- **Usage**: `/schedule list`
- **Description**: Shows all scheduled announcements with IDs, status, schedule, and next run time.

#### `/schedule create once <time> <message>`
Create one-time scheduled announcement.
- **Usage**: `/schedule create once 14:30 Reminder text` or `/schedule create once tomorrow 9am Message` or `/schedule create once 2h Important update`
- **Time formats**:
  - Absolute: `14:30`, `tomorrow 14:30`, `2025-11-05 14:30`
  - Relative: `30m`, `2h`, `1d`
- **Options**: Add `--all` to send to all users (default: lobby only), `--notes="context"` for internal notes

#### `/schedule create recurring <preset|pattern> <message>`
Create recurring scheduled announcement.
- **Usage**: `/schedule create recurring daily-9am Good morning!` or `/schedule create recurring 0 */3 * * * Check-in reminder`
- **Presets**:
  - `daily-9am`, `daily-12pm`, `daily-6pm`, `daily-midnight`
  - `weekly-monday`, `weekly-friday`, `weekly-sunday`
  - `hourly`, `every-3h`, `every-6h`
- **Custom cron**: Standard cron pattern (e.g., `0 9 * * 1-5` for weekdays at 9am)
- **Options**: Same as one-time announcements

#### `/schedule view <id>`
View announcement details.
- **Usage**: `/schedule view 12345`
- **Description**: Shows full details including message, schedule, sent count, and history.

#### `/schedule pause <id>`
Pause a scheduled announcement.
- **Usage**: `/schedule pause 12345`
- **Description**: Temporarily stops announcement from sending. Can be resumed later.

#### `/schedule resume <id>`
Resume a paused announcement.
- **Usage**: `/schedule resume 12345`
- **Description**: Reactivates paused announcement.

#### `/schedule delete <id>`
Delete a scheduled announcement.
- **Usage**: `/schedule delete 12345`
- **Description**: Permanently removes scheduled announcement.

#### `/schedule test <id>`
Test an announcement (sends to you only).
- **Usage**: `/schedule test 12345`
- **Description**: Sends test message to yourself to preview formatting and content.

### Lobby Configuration

#### `/slowmode <seconds>` or `/slowmode off`
Configure slowmode rate limiting.
- **Usage**: `/slowmode 30` or `/slowmode off` or `/slowmode` (check status)
- **Range**: 1-3600 seconds
- **Description**: Sets minimum delay between messages per user. Admins/mods/whitelist exempt.

#### `/invite_on` / `/invite_off`
Toggle invite-only mode.
- **Usage**: `/invite_on` or `/invite_off`
- **Description**: When enabled, users need valid invite code to join lobby.

#### `/invite_new <uses> <expiry> <notes>`
Generate new invite code.
- **Usage**: `/invite_new 5 7d For friends` or `/invite_new 10 2025-12-31 Holiday special`
- **Uses**: Number of times code can be used (0 = unlimited)
- **Expiry formats**: Relative (`7d`, `24h`, `30m`) or absolute date (`2025-12-31`)
- **Notes**: Optional description for tracking
- **Description**: Creates shareable invite code. Returns code that users can use with `/join CODE`.

#### `/invite_list`
View all invite codes.
- **Usage**: `/invite_list`
- **Description**: Shows all invites with status, remaining uses, expiry, and usage stats.

#### `/invite_revoke <code>`
Deactivate an invite code.
- **Usage**: `/invite_revoke CODE123`
- **Description**: Makes invite code invalid. Can be reactivated with `/invite_activate`.

#### `/invite_activate <code>`
Reactivate a revoked invite.
- **Usage**: `/invite_activate CODE123`
- **Description**: Makes previously revoked invite code valid again.

#### `/invite_delete <code>`
Permanently delete invite code.
- **Usage**: `/invite_delete CODE123`
- **Description**: Completely removes invite from database. Cannot be undone.

#### `/welcome` or `/welcome on [message]`
Configure welcome messages.
- **Usage**: `/welcome`, `/welcome on`, `/welcome on Welcome to our lobby! Read /rules`, `/welcome off`, `/welcome set New message text`
- **Subcommands**:
  - No args: Show status
  - `on [message]`: Enable with optional custom message
  - `off`: Disable
  - `set <message>`: Update message
- **Description**: Automatic welcome message sent to new lobby members. Supports HTML formatting.

#### `/maintenance [on|off]`
Toggle maintenance mode.
- **Usage**: `/maintenance on` or `/maintenance off` or `/maintenance` (check status)
- **Description**: When enabled, only admins can interact with bot. Others see maintenance message.

### Content Moderation

#### `/filter add <pattern> [notes]`
Add content filter.
- **Usage**: `/filter add badword Internal note` or `/filter add https?://spam\.com Spam domain`
- **Description**: Blocks messages matching keyword or regex pattern. Case-insensitive by default.

#### `/filter list`
View all content filters.
- **Usage**: `/filter list`
- **Description**: Shows all filters with IDs, patterns, status (active/inactive), and creation info.

#### `/filter remove <id>`
Delete a content filter.
- **Usage**: `/filter remove 123`
- **Description**: Permanently removes filter. Get ID from `/filter list`.

#### `/filter toggle <id>`
Enable or disable a filter.
- **Usage**: `/filter toggle 123`
- **Description**: Switches filter between active and inactive without deleting.

#### `/linkwhitelist` (commands to be verified)
Manage link whitelist.
- **Description**: Commands for allowing specific domains/URLs. Prevents link spam filter from blocking trusted domains.

#### `/linkpermissions` (commands to be verified)
Manage link posting permissions.
- **Description**: Configure which roles/users can post links.

### Anti-Spam System

#### `/antispam`
View anti-spam configuration and statistics.
- **Usage**: `/antispam`
- **Description**: Shows current settings, detection thresholds, and overall spam statistics.

#### `/antispam config`
View detailed configuration options.
- **Usage**: `/antispam config`
- **Description**: Lists all configurable options with current values and descriptions.

#### `/antispam set <option> <value>`
Update anti-spam setting.
- **Usage**: `/antispam set floodMessageCount 4` or `/antispam set linkMaxPerMessage 3`
- **Options**:
  - `floodEnabled` (true/false): Enable flood detection
  - `floodMessageCount` (2-10): Repeated message threshold
  - `floodTimeWindow` (10-300s): Time window for flood detection
  - `floodSimilarityThreshold` (0.5-1.0): Message similarity threshold (85% default)
  - `rapidFireEnabled` (true/false): Enable rapid-fire detection
  - `rapidFireMessageCount` (5-50): Messages per minute threshold
  - `rapidFireTimeWindow` (30-300s): Time window for rapid-fire
  - `linkSpamEnabled` (true/false): Enable link spam detection
  - `linkMaxPerMessage` (1-10): Max links per message
  - `linkMaxPerMinute` (3-30): Max links per minute
- **Description**: Customizes spam detection sensitivity and behavior.

#### `/antispam whitelist <alias>`
Exempt user from spam detection.
- **Usage**: `/antispam whitelist TrustedUser`
- **Description**: User bypasses all spam checks. Separate from role-based whitelist.

#### `/antispam unwhitelist <alias>`
Remove spam detection exemption.
- **Usage**: `/antispam unwhitelist SomeUser`
- **Description**: User is subject to spam checks again.

#### `/antispam reset <alias>`
Reset user's spam violation count.
- **Usage**: `/antispam reset SomeUser`
- **Description**: Clears violation history, resetting escalation level.

#### `/antispam clear <alias>`
Clear user's active auto-mute.
- **Usage**: `/antispam clear SomeUser`
- **Description**: Removes automatic mute applied by spam system. Doesn't remove manual mutes.

#### `/antispam top`
View top 10 spam offenders.
- **Usage**: `/antispam top`
- **Description**: Shows users with most spam violations for monitoring repeat offenders.

### Audit & Statistics

#### `/auditlog` or `/audit`
View moderation history.
- **Aliases**: `/audit`
- **Usage**: `/auditlog`, `/auditlog 2` (page 2), `/auditlog ban`, `/auditlog user SomeUser`, `/auditlog mod ModName`
- **Filters**:
  - Page number: `/auditlog 2`
  - Action type: `/auditlog ban`, `/auditlog mute`, `/auditlog kick`
  - Target user: `/auditlog user SomeUser`
  - Moderator: `/auditlog mod ModName`
- **Description**: Shows last 20 audit log entries per page. Tracks 41+ action types. Supports pagination and filtering.

#### `/stats` or `/statistics`
View comprehensive lobby statistics.
- **Aliases**: `/statistics`
- **Usage**: `/stats`, `/stats user SomeUser`, `/stats period day`, `/stats week`
- **Modes**:
  - Overall: `/stats` - General lobby statistics
  - User-specific: `/stats user Alice` - Individual user breakdown
  - Time-based: `/stats period day|week|month` or shortcuts `/stats day`
- **Metrics**: User counts, message totals, text vs media breakdown, participation rates, top contributors, engagement levels, moderation summary
- **Cache**: 5-minute cache for performance

### Data Management

#### `/export` (commands to be verified)
Export bot data.
- **Description**: Export user data, messages, or full database dump. Privacy compliance feature.

#### `/blocked`
View users who blocked the bot.
- **Usage**: `/blocked` or `/blocked cleanup`
- **Description**: Lists all users who blocked the bot (detected via 403 errors). `cleanup` subcommand removes them from database.

### System

#### `/restart` or `/reload`
Restart the bot process (Owner only).
- **Aliases**: `/reload`
- **Usage**: `/restart` or `/reload`
- **Access**: Owner only (ADMIN_ID)
- **Description**: Gracefully restarts the bot using PM2. Sends confirmation message before restarting. Falls back to process exit if PM2 reload fails. Hidden from help menu.

#### `/botstats`
View bot performance metrics.
- **Usage**: `/botstats`
- **Description**: Shows system metrics like uptime, memory usage, database stats, and performance indicators.

---

## Command Aliases

Many commands have shorter aliases for convenience:

| Command | Aliases |
|---------|---------|
| `/profile` | None |
| `/icon` | `/avatar` |
| `/send` | `/s` |
| `/preferences` | `/prefs`, `/settings` |
| `/leaderboard` | `/top`, `/lb` |
| `/search` | `/find` |
| `/auditlog` | `/audit` |
| `/statistics` | `/stats` |

---

## Permission Levels

### User (Default)
All registered users have access to user commands.

### Moderator
Inherits user permissions plus moderator commands:
- User information viewing
- Report management
- Temporary moderation actions (cooldown)

### Admin
Full access to all commands including:
- Permanent moderation actions (ban, kick, permanent mute)
- Lobby configuration
- Content filters and anti-spam
- Role management
- Data export and system management

### Whitelist
Special role that exempts users from:
- Slowmode restrictions
- Content filters
- Compliance checks
- Spam detection
- Does NOT grant moderator/admin commands

---

## Notes

- Commands are case-sensitive
- Arguments in `<>` are required, `[]` are optional
- Duration formats: `30s`, `5m`, `2h`, `7d`, `1w`
- Most commands provide interactive help if used incorrectly
- Some commands support reply-to-message shortcuts (block, report, delete, pin)
- Admin commands are logged in audit trail
- Deprecated commands still work but show deprecation notices
