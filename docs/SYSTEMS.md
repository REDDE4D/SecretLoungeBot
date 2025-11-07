# Systems Documentation

Detailed documentation for all bot features and systems.

## Table of Contents

- [Core Systems](#core-systems)
  - [Message Relay System](#message-relay-system)
  - [User Management](#user-management)
  - [Activity Tracking](#activity-tracking)
- [Communication Features](#communication-features)
  - [Reply Threading](#reply-threading)
  - [Message Editing](#message-editing)
  - [Native Reactions](#native-reactions)
  - [Polls System](#polls-system)
  - [Pin System](#pin-system)
- [User Features](#user-features)
  - [User Blocking](#user-blocking)
  - [User Preferences](#user-preferences)
  - [Message Search](#message-search)
  - [Chat History](#chat-history)
  - [Profiles & Stats](#profiles--stats)
- [Moderation Systems](#moderation-systems)
  - [Anti-Spam System](#anti-spam-system)
  - [Report System](#report-system)
  - [Content Filters](#content-filters)
  - [Slowmode](#slowmode)
  - [Audit Log System](#audit-log-system)
- [Access Control](#access-control)
  - [Invite System](#invite-system)
  - [Link Whitelisting](#link-whitelisting)
  - [Permissions System](#permissions-system)
  - [Custom Roles](#custom-roles)
- [Administrative Features](#administrative-features)
  - [Scheduled Announcements](#scheduled-announcements)
  - [Statistics Dashboard](#statistics-dashboard)
  - [Welcome Messages](#welcome-messages)
  - [Maintenance Mode](#maintenance-mode)
  - [Blocked Bot Detection](#blocked-bot-detection)
- [Infrastructure](#infrastructure)
  - [Compliance System](#compliance-system)
  - [Enhanced Logging](#enhanced-logging)
  - [Metrics Collection](#metrics-collection)
  - [Error Handling](#error-handling)

---

## Core Systems

### Message Relay System

**Purpose**: Anonymous message forwarding between lobby members.

**Files**:
- `src/relay.js` - Entry point
- `src/relay/standardMessage.js` - Text and single media
- `src/relay/mediaGroup.js` - Albums/media groups
- `src/relay/editRelay.js` - Edit propagation

**How It Works**:

1. **Message Reception** (`src/handlers/relayHandler.js`):
   - Receives message from user
   - Checks user status (banned, muted, in lobby)
   - Validates message (no @ mentions except via `/s`, no bot commands)
   - Tracks activity and media count
   - Checks slowmode and content filters

2. **Message Classification** (`src/relay.js`):
   - Detects if message is part of media group via `media_group_id`
   - Routes to `standardMessage.js` or `mediaGroup.js`

3. **Standard Message Relay** (`src/relay/standardMessage.js`):
   - Formats message with sender's icon and alias header
   - Handles reply threading (preserves reply chains)
   - Supports: text, photo, video, audio, document, sticker, voice, animation
   - Implements `sendWithRetry()` with exponential backoff for rate limits
   - Automatic fallback to non-reply if reply target unavailable

4. **Media Group Relay** (`src/relay/mediaGroup.js`):
   - Buffers items by `media_group_id` for 1.5 seconds
   - Collects all items in album
   - Preserves order and caption on first item
   - Sends as cohesive album to all recipients

5. **Recipient Distribution**:
   - Queries all users with `inLobby: true`
   - Excludes sender
   - Filters out users who blocked the sender (Block model)
   - Respects user preferences (compact mode, etc.)
   - 200ms delay between sends to avoid rate limits
   - Stores mapping in RelayedMessage for threading/edits/reactions

**Message Format**:

```
┌────────────────────────
│ 🎭 Alias
│ Message content here
└────────────────────────
```

**Compact Mode** (user preference):
```
🎭 Alias: Message content
```

**Rate Limiting**:
- `sendWithRetry()` respects Telegram's `retry_after` header (HTTP 429)
- Exponential backoff: 1s → 2s → 4s → 8s
- 200ms delay between recipients
- Automatic retry on transient failures

**Error Handling**:
- Per-recipient failures logged but don't stop other deliveries
- HTTP 403 (blocked bot) marks user as `blockedBot: true`
- HTTP 400 (bad reply) retries without reply target
- Graceful degradation for all error types

---

### User Management

**Purpose**: Registration, profile management, roles, moderation.

**Files**: `src/users/index.js`

**Core Operations**:

#### Registration
- **Function**: `createUser(userId, alias, icon)`
- **Validation**: Alias must be 2-32 chars, unique, alphanumeric + allowed symbols
- **Default Icon**: Random emoji from preset list
- **Creates**: User document and Activity document

#### Alias Management
- **Function**: `updateUserAlias(userId, newAlias)`
- **Validation**: Same as registration
- **Uniqueness**: Checked before update
- **Announcements**: Lobby notified of alias change

#### Icon Customization
- **Function**: `updateUserIcon(userId, iconData)`
- **Types**: Preset emoji or custom emoji ID (Premium)
- **Fallback**: Non-premium users see fallback emoji

#### Lobby Operations
- **Join**: `joinLobby(userId)`
  - Sets `inLobby: true`
  - Announces to lobby
  - Checks invite code if invite-only mode
- **Leave**: `leaveLobby(userId)`
  - Sets `inLobby: false`
  - Announces to lobby
  - Preserves registration

#### Role Management
- **Roles**: admin, mod, whitelist, custom roles
- **Admin**: Full access, all commands
- **Mod**: User info, report management, temporary moderation
- **Whitelist**: Exemptions (slowmode, filters, compliance, spam)
- **Custom Roles**: Permission-based system (see Custom Roles section)

#### Moderation Actions
- **Mute**: `muteUser(userId, duration)` - Prevents sending messages
- **Ban**: `banUser(userId, duration)` - Removes from lobby, prevents rejoin
- **Kick**: `kickUser(userId)` - Removes from lobby, can rejoin
- **Warn**: `warnUser(userId, reason)` - Issues warning (3 = permanent ban)
- **Media Restrict**: `setMediaRestriction(userId, restricted)` - Blocks media

**Lookups**:
- By ID: `getUserById(userId)`
- By alias: `getUserByAlias(alias)` (case-insensitive)
- Bulk operations: `getAllUserMeta()`, `getAllAliases()`

---

### Activity Tracking

**Purpose**: User status, media compliance, statistics.

**Files**: `src/users/activity.js`

**Status System**:

**Three States**:
1. **Online**: Actively sending messages
2. **Idle**: No activity for 15 minutes
3. **Offline**: No activity for 60 minutes

**Transitions**:
- Message sent → Online
- 15 min timer → Idle
- 60 min timer → Offline

**Status Announcements**:
- Broadcast to all lobby members when status changes
- Respects user preference `hideStatusAnnouncements`
- Formatted with MarkdownV2 escaping
- Cached to prevent duplicate announcements (`lastAnnounced` map)

**Automatic Cleanup**:
- Status timers cleared after offline transition
- `lastAnnounced` cache cleaned every 30 minutes

**Media Counting**:

**First 24 Hours**:
- Increments `mediaCount.first24h` for each media message
- Used by compliance: must send 10 media in first 24 hours

**Daily Media**:
- Increments `mediaCount.byDate[YYYY-MM-DD]` for each media message
- Used by compliance: must send 1 media per day
- Map automatically grows with new dates

**Message Statistics**:

**Tracked Metrics** (for profiles/leaderboards):
- `totalMessages`: All messages sent
- `totalReplies`: Messages that are replies
- `totalTextMessages`: Text-only messages
- `totalMediaMessages`: Media messages

**Update Function**: `trackMessage(userId, { isReply, isMedia })`
- Called after successful relay
- Updates appropriate counters atomically
- Updates `lastActive` timestamp
- Triggers status transition to online

**Batch Operations**:
- `getAllActivities()`: Fetch all activity documents
- Used for compliance checks and online user lists
- Prevents N+1 query problems

---

## Communication Features

### Reply Threading

**Purpose**: Preserve conversation threads across relayed messages.

**Files**:
- `src/relay/quoteMap.js` - Main logic
- `src/models/QuoteLink.js` - Temporary cache
- `src/models/RelayedMessage.js` - Persistent storage

**How It Works**:

1. **Message Relayed**:
   - `linkRelay()` creates QuoteLink with 2-minute TTL
   - Stores: messageId, userId, originalUserId, originalMsgId, senderAlias, preview
   - Also stores in RelayedMessage (persistent, no TTL)

2. **User Replies**:
   - User replies to a relayed message in their chat
   - Bot detects `reply_to_message` in context

3. **Original Resolution**:
   - `resolveOriginalFromReply()` looks up QuoteLink first (fast, 2-minute TTL)
   - If expired, falls back to RelayedMessage (persistent)
   - Returns: originalUserId, originalMsgId, senderAlias

4. **Reply Relay**:
   - **For original sender**: Reply references their original message
   - **For other users**: Reply references their copy of the relayed message
   - Uses `findRelayedMessageId()` to find recipient's copy

**Two-Tier System**:
- **QuoteLink** (2-minute TTL): Fast lookup for recent messages, memory efficient
- **RelayedMessage** (permanent): Fallback for older messages, complete history

**Graceful Degradation**:
- If reply target not found → send without reply
- Automatic retry without reply on HTTP 400 errors
- Never fails to send message due to threading issues

**Context Preservation**:
- QuoteLink stores sender alias and preview
- Rich context for debugging and logging
- Preview truncated to reasonable length

---

### Message Editing

**Purpose**: Propagate message edits across all relayed copies.

**Files**:
- `src/handlers/relayHandler.js` - Listener
- `src/relay/editRelay.js` - Edit logic

**How It Works**:

1. **Edit Detection**:
   - Bot listens for `edited_message` event
   - Triggered when user edits their message in chat

2. **Validation**:
   - Check if user is in lobby
   - Check if user is not banned/muted
   - Ignore bot commands

3. **Copy Lookup**:
   - Query RelayedMessage for all copies
   - Find by `originalUserId` and `originalMsgId`
   - Returns list of all recipients and their message IDs

4. **Edit Propagation**:
   - For each recipient, call `ctx.telegram.editMessageText()` or `editMessageCaption()`
   - Adds "(edited)" indicator
   - Preserves original formatting (icon + alias header)
   - 100ms delay between edits to avoid rate limits

5. **Error Handling**:
   - HTTP 403 (blocked) → silently skip
   - HTTP 400 (deleted message) → silently skip
   - Other errors → log but continue

**Supported**:
- Text message edits
- Media caption edits

**Not Supported**:
- Media file replacement (Telegram limitation)
- Message deletion relay (requires webhooks, not polling)

**User Experience**:
- Seamless edit propagation
- "(edited)" indicator for transparency
- Works for messages of any age (no TTL)

---

### Native Reactions

**Purpose**: Sync reactions across all message copies using Telegram's native system.

**Files**: `src/handlers/relayHandler.js`

**How It Works**:

1. **Reaction Detection**:
   - Bot listens for `message_reaction` event
   - User reacts using Telegram's native reaction UI (long-press)

2. **Validation**:
   - Check if user is in lobby
   - Check if user is not banned/muted
   - Extract reaction data from `ctx.update.message_reaction`

3. **Copy Lookup**:
   - Query RelayedMessage for all copies (including original)
   - Find by `originalUserId` and `originalMsgId`
   - Returns ALL copies (sender's message + all recipient copies)

4. **Reaction Propagation**:
   - For each copy, call `ctx.telegram.setMessageReaction()`
   - Bot mirrors user's reaction on all copies
   - 50ms delay between reactions to avoid rate limits
   - Includes the message the user reacted to (no skipping)

5. **Error Handling**:
   - HTTP 403 (blocked) → silently ignore
   - HTTP 400 (deleted message) → silently ignore
   - Continue with remaining copies

**Features**:
- Native Telegram UI integration
- Supports full Telegram reaction set (not limited to specific emojis)
- Reactions visible to all lobby members
- Bot reaction appears as "bot reacted"
- No custom database storage needed

**User Experience**:
- Natural Telegram UI (long-press message)
- Reactions sync across all users instantly
- All users see same reactions on their copy

**Technical Details**:
- Uses `ctx.telegram.setMessageReaction(chatId, messageId, reactions)`
- Reactions parameter: array of emoji or custom emoji objects
- Accesses reaction data from `ctx.update.message_reaction.new_reaction`
- Batch query prevents N+1 problems

---

### Polls System

**Purpose**: Anonymous voting with real-time results.

**Files**: `src/commands/user/poll.js`, `src/models/Poll.js`

**How It Works**:

1. **Poll Creation** (`/poll question | opt1 | opt2 | ...`):
   - Parse question and 2-6 options (split by `|`)
   - Create Poll document
   - Generate inline keyboard with vote buttons
   - Relay poll message to all lobby members
   - Store `relayedMessageIds` for each recipient

2. **Voting** (inline button callback):
   - User taps option button
   - Bot identifies poll and option
   - Check if user already voted for this option → unvote
   - Check if user voted for different option → move vote
   - Update Poll document (`$addToSet` or `$pull` on option.votes)
   - Update inline keyboard with new counts

3. **Result Updates**:
   - For each relayed copy, update inline keyboard
   - Shows current vote counts per option
   - Uses `relayedMessageIds` to find all copies
   - 50ms delay between updates

4. **Poll Closing** (`/endpoll`):
   - Find creator's most recent active poll
   - Set `isActive: false`
   - Generate final results with visual progress bars
   - Update all copies with final results (no more buttons)
   - Broadcast final results to lobby

**Features**:
- Anonymous voting (vote attribution not displayed)
- Single-choice (can change vote or unvote)
- Live count updates visible to all
- Only creator can close poll
- Visual progress bars in final results

**Vote Privacy**:
- User IDs stored in `option.votes` array
- Used for vote management (change/unvote)
- Never displayed to users
- Only counts shown

**Technical Details**:
- Inline keyboard buttons with callback data: `poll_vote:<pollId>:<optionIndex>`
- Vote count formatted: `[count] Option text`
- Progress bars: `█` character repeated proportionally
- Keyboard updates via `ctx.telegram.editMessageReplyMarkup()`

---

### Pin System

**Purpose**: Native Telegram pins for announcements and important messages.

**Files**: `src/commands/admin/pins.js`, `src/models/PinnedMessage.js`

**Two Pin Types**:

#### 1. Announcement Pins
**Usage**: `/pin <text>`
- Admin sends text to create new announcement
- Message sent to all lobby members
- Each copy pinned in recipient's chat
- Stores text and message IDs

#### 2. Relayed Message Pins
**Usage**: Reply to message with `/pin`
- Admin replies to any relayed message
- Bot finds all copies via RelayedMessage
- Pins each copy in recipient's chat
- Stores original message reference and message IDs

**How It Works**:

1. **Pin Creation**:
   - Determine type based on command usage
   - If text provided → announcement
   - If reply → relayed message pin
   - Create PinnedMessage document

2. **Pinning Process**:
   - For each lobby member:
     - Find their copy of message (or send announcement)
     - Call `ctx.telegram.pinChatMessage(chatId, messageId, { disable_notification: true })`
     - Store in `relayedMessageIds` map
     - 100ms delay between pins

3. **Viewing Pins** (`/pinned`):
   - Query all PinnedMessage documents
   - Display list with IDs, dates, type
   - Announcement pins show full text
   - Relayed pins show "Pinned lobby message"

4. **Unpinning** (`/unpin <id>`):
   - Find PinnedMessage by ID
   - For each recipient in `relayedMessageIds`:
     - Call `ctx.telegram.unpinChatMessage(chatId, messageId)`
     - 100ms delay between unpins
   - Delete PinnedMessage document

**Features**:
- Native Telegram pins (appear at top of chat)
- Users can individually unpin without affecting others
- Maximum 5 pinned messages enforced
- Persistent across restarts
- Error handling for blocked users

**User Experience**:
- Pins visible at top of chat
- Tap pin to jump to message
- Multiple pins shown as list
- Personal unpin doesn't affect others

**Technical Details**:
- Uses `ctx.telegram.pinChatMessage()` and `unpinChatMessage()`
- `disable_notification: true` prevents notification spam
- Graceful handling of 403 (blocked) and 400 (deleted message)
- Message IDs stored in Map for unpinning

---

## User Features

### User Blocking

**Purpose**: Personal blocking to hide specific users' messages.

**Files**: `src/commands/user/block.js`, `src/models/Block.js`

**How It Works**:

1. **Blocking** (`/block <alias>` or reply):
   - Resolve alias to user ID (or get from replied message)
   - Create Block document with `blockerId` and `blockedId`
   - Confirm to blocker

2. **Relay Filtering**:
   - During relay, query Block collection
   - Skip recipients where blocker has blocked sender
   - Query: `Block.findOne({ blockerId: recipientId, blockedId: senderId })`
   - Silent filtering (blocked user unaware)

3. **Unblocking** (`/unblock <alias>` or reply):
   - Resolve alias to user ID
   - Delete Block document
   - Confirm to unblocker

4. **Block List** (`/blocklist`):
   - Query all blocks by blocker: `Block.find({ blockerId })`
   - Display list with aliases and block dates
   - Inline buttons for quick unblock

**Features**:
- Personal setting (doesn't affect others)
- Blocked user unaware (no notifications)
- Can block via alias or reply to message
- Block list with one-tap unblock
- No limit on blocks

**Privacy**:
- Blocked user doesn't know they're blocked
- Blocker simply stops seeing their messages
- No announcements or notifications

**Performance**:
- Compound index on `blockerId + blockedId` for fast lookups
- Separate index on `blockerId` for block list queries
- Lightweight check during relay

**Technical Details**:
- Block document created with cached alias for display
- Alias updated if blocked user changes alias (future enhancement)
- No effect on other users' views

---

### User Preferences

**Purpose**: Customizable personal settings.

**Files**: `src/commands/user/preferences.js`, `src/models/Preferences.js`

**Available Preferences**:

#### 1. Hide Status Announcements
- **Setting**: `hideStatusAnnouncements`
- **Values**: true/false
- **Effect**: Hides online/idle/offline announcements
- **Quick toggle**: `/quiet`

#### 2. Compact Mode
- **Setting**: `compactMode`
- **Values**: true/false
- **Effect**: Compact message formatting (no box, inline icon + alias)
- **Quick toggle**: `/compact`

#### 3. Hide Join/Leave Announcements
- **Setting**: `hideJoinLeaveAnnouncements`
- **Values**: true/false
- **Effect**: Hides user join/leave lobby announcements

#### 4. Notification Preference
- **Setting**: `notificationPreference`
- **Values**: all, mentions_only, none
- **Effect**: Controls which messages trigger notifications
- **Future feature**: Requires Telegram notification API integration

#### 5. Auto Mark Read
- **Setting**: `autoMarkRead`
- **Values**: true/false
- **Effect**: Automatically mark messages as read
- **Status**: Future feature (requires Telegram read receipt API)

**How It Works**:

1. **View Preferences** (`/preferences`):
   - Fetch or create Preferences document
   - Display current settings
   - Inline keyboard for quick toggles

2. **Update Preference** (`/preferences set <option> <value>`):
   - Validate option name
   - Validate value type and range
   - Update Preferences document
   - Confirm change to user

3. **Quick Toggles** (`/compact`, `/quiet`):
   - One-command toggle for common preferences
   - No need to remember setting names
   - Instant feedback

**Integration Points**:
- **Relay system**: Checks `compactMode` for message formatting
- **Status announcements**: Checks `hideStatusAnnouncements` before sending
- **Join/leave**: Checks `hideJoinLeaveAnnouncements` before sending
- **Notifications**: Future integration with Telegram notification API

**Default Values**:
- All preferences default to false or 'all'
- Backwards compatible (missing preferences treated as defaults)
- Created on first preference change

**User Experience**:
- Personalized experience without affecting others
- Quick toggles for common settings
- Interactive menu for all preferences
- Instant effect on new messages

---

### Message Search

**Purpose**: Search own sent messages.

**Files**: `src/commands/user/search.js`

**How It Works**:

1. **Search Execution** (`/search <query>` or `/find <query>`):
   - Query RelayedMessage collection
   - Filter: `originalUserId: userId` (only user's messages)
   - Match: Case-insensitive regex on message text/caption
   - Limit: Last 50 matches
   - Sort: Newest first

2. **Result Formatting**:
   - For each match:
     - Message type icon
     - Timestamp (relative, e.g., "2 hours ago")
     - Text preview with highlighted match
     - Truncate long messages
   - Group results in paginated message

3. **Privacy**:
   - Only searches user's own sent messages
   - Cannot search other users' messages
   - No admin/mod override

**Features**:
- Case-insensitive search
- Regex pattern support
- Searches text messages and media captions
- Returns last 50 matches
- Highlighted search term in results
- Relative timestamps

**Search Patterns**:
- Simple: `/search hello` → matches "hello", "Hello", "HELLO"
- Regex: `/search hell.*world` → matches "hello world", "hell world"
- Multiple words: `/search some phrase` → matches "some phrase"

**Performance**:
- Indexed by `originalUserId` for fast filtering
- Limit 50 prevents large result sets
- Text search uses MongoDB text index (if available)

**User Experience**:
- Quick way to find own past messages
- Useful for reference and context
- No privacy concerns (only own messages)

---

### Chat History

**Purpose**: View recent lobby message history.

**Files**: `src/commands/user/history.js`

**How It Works**:

1. **History Request** (`/history`):
   - Check user is in lobby
   - Query RelayedMessage collection
   - Filter: `relayedAt` > 12 hours ago
   - Group by unique original messages (deduplicate)
   - Limit: 50 messages
   - Sort: Chronological order

2. **Message Reconstruction**:
   - Fetch sender info in batch (avoid N+1)
   - For each message:
     - Reconstruct with icon + alias header
     - Text: Send as text message
     - Media: Resend using stored file_id
     - Albums: Group by `albumId` and send as media group
   - Preserve original formatting

3. **Media Handling**:
   - Use stored Telegram file_id (no re-upload)
   - Support: photo, video, audio, document, voice, sticker, animation
   - Captions included
   - Albums reconstructed from individual items

4. **Rate Limiting**:
   - 200ms delay between messages
   - Uses `sendWithRetry()` for automatic retry
   - Respects Telegram rate limits

**Features**:
- Last 50 messages from past 12 hours
- All message types (text, media, albums)
- Original formatting preserved
- Chronological order
- No duplicates (groups by original message)

**Deduplication**:
- Groups by `originalUserId + originalMsgId`
- Each unique message appears once
- Prevents seeing same message multiple times

**Access Control**:
- Only lobby members can use
- No opt-out mechanism
- All lobby messages considered public history

**Performance**:
- Indexed by `relayedAt` for time filtering
- Batch user info fetch
- Limits result set to 50

**User Experience**:
- New members can catch up
- Reference past conversations
- Useful after being offline

**Technical Details**:
- Uses existing relay utilities: `escapeHTML()`, `renderIconHTML()`
- File IDs directly from RelayedMessage
- Album reconstruction via `albumId` grouping

---

### Profiles & Stats

**Purpose**: User profiles, statistics, leaderboards, tenure tracking.

**Files**:
- `src/commands/user/profile.js` - Profile display
- `src/commands/user/leaderboard.js` - Rankings
- `src/commands/user/tenure.js` - Membership duration

**Profile System** (`/profile [alias]`):

**Displayed Information**:
- Alias and icon
- Role badges (admin/mod/whitelist/custom roles)
- Join date and tenure (days/months/years)
- Message statistics:
  - Total messages
  - Replies count
  - Text vs media breakdown
- Leaderboard rank
- Achievement badges
- Moderation info (if mod/admin viewing or own profile):
  - Warnings count
  - Mute/ban status
  - Media restrictions

**Achievement Badges**:
- Message milestones: 100, 500, 1000, 5000, 10000 messages
- Tenure milestones: 1 week, 1 month, 6 months, 1 year
- Role badges: Admin, Moderator, Whitelist
- Special badges: First member, most active, etc. (future)

**Leaderboard System** (`/leaderboard [timeframe]`):

**Timeframes**:
- **Daily**: Most messages today
- **Weekly**: Most messages this week
- **All-time**: Total message count

**Display**:
- Top 10 users
- Rank, alias, message count
- Highlighted if viewing user is in top 10
- Percentage of total messages (all-time only)

**Tenure System** (`/tenure`):

**Display**:
- Exact membership duration
- Milestone tracker:
  - 1 week, 1 month, 3 months, 6 months, 1 year, 2 years, 5 years
- Next milestone countdown
- Tenure rank (optional)

**Statistics Tracking**:

**Updated on Message Send**:
- `totalMessages++`
- `totalReplies++` (if reply)
- `totalTextMessages++` or `totalMediaMessages++`

**Function**: `trackMessage(userId, { isReply, isMedia })`
- Atomic updates
- No race conditions
- Called after successful relay

**Privacy**:
- Basic profile info visible to all
- Moderation info only to mods/admins or own profile
- Option to hide profile (future feature)

**Performance**:
- Leaderboard cached (5-minute TTL)
- Batch queries for multiple profiles
- Indexes on message counts for fast sorting

---

## Moderation Systems

### Anti-Spam System

**Purpose**: Automatic spam detection and escalating mutes.

**Files**:
- `src/handlers/spamHandler.js` - Detection logic
- `src/models/SpamDetection.js` - Violation tracking
- `src/commands/admin/antispam.js` - Admin commands

**Three Detection Types**:

#### 1. Flood Detection
**Threshold**: 4 similar messages within 60 seconds (configurable)
**Similarity**: 85% match using Levenshtein distance
**How it works**:
- Stores last N messages in `recentMessages` buffer
- Compares new message to recent messages
- Calculates similarity ratio
- Triggers if threshold exceeded

#### 2. Link Spam Detection
**Thresholds**:
- Max 3 links per message (configurable)
- Max 10 links per minute (configurable)
**How it works**:
- Extracts URLs from message text/caption
- Counts links in current message
- Counts links in last minute
- Triggers if either threshold exceeded
- Checks LinkWhitelist for exemptions

#### 3. Rapid-Fire Detection
**Threshold**: 10+ messages per minute (configurable)
**How it works**:
- Counts messages in last 60 seconds
- Triggers if rate exceeded
- Useful for burst spam

**Auto-Mute Escalation**:

**Levels**:
1. First violation: 5 minutes
2. Second: 15 minutes
3. Third: 1 hour
4. Fourth: 24 hours
5. Fifth+: 7 days

**Escalation Logic**:
- Each violation increments `autoMuteLevel`
- Mute duration based on level
- Sets `mutedUntil` in User model
- Increments `violationCount`

**Exemptions**:
- Admin role
- Mod role
- Whitelist role
- Spam-specific whitelist (`/antispam whitelist`)

**Admin Commands**:

**View Config** (`/antispam`, `/antispam config`):
- Current settings and thresholds
- Overall spam statistics
- Detection enabled/disabled status

**Update Settings** (`/antispam set <option> <value>`):
- `floodEnabled` (true/false)
- `floodMessageCount` (2-10)
- `floodTimeWindow` (10-300s)
- `floodSimilarityThreshold` (0.5-1.0)
- `rapidFireEnabled` (true/false)
- `rapidFireMessageCount` (5-50)
- `rapidFireTimeWindow` (30-300s)
- `linkSpamEnabled` (true/false)
- `linkMaxPerMessage` (1-10)
- `linkMaxPerMinute` (3-30)

**User Management**:
- `/antispam whitelist <alias>` - Exempt user
- `/antispam unwhitelist <alias>` - Remove exemption
- `/antispam reset <alias>` - Reset violation count
- `/antispam clear <alias>` - Remove auto-mute
- `/antispam top` - View top 10 offenders

**Integration**:
- Checked in `src/handlers/relayHandler.js` before relay
- Violations logged in SpamDetection model
- Audit log entries for all actions
- User notified of violation and mute duration

**User Experience**:
- Automatic protection without mod intervention
- Clear violation messages
- Fair escalation system
- Appeals via admins

**Technical Details**:
- Levenshtein distance algorithm for similarity
- URL extraction via regex
- Time window queries with `$gte` filters
- Atomic updates to violation count

---

### Report System

**Purpose**: User-submitted reports of problematic content.

**Files**:
- `src/commands/user/report.js` - Report submission
- `src/commands/mod/reports.js` - Report management
- `src/models/Report.js` - Report storage

**Report Submission** (`/report [reason]`):

**How It Works**:
1. User replies to problematic message with `/report [reason]`
2. Bot extracts:
   - Reporter ID
   - Replied message ID and preview
   - Message type
   - Optional reason
3. Resolves original sender from RelayedMessage
4. Creates Report document
5. Notifies all moderators/admins

**Report Management**:

**List Reports** (`/reports`):
- Shows all pending reports
- Display: ID, reporter alias, reported user, reason, timestamp
- Paginated (20 per page)

**View Details** (`/viewreport <id>`):
- Full report information
- Message preview (200 chars)
- Message type
- Reporter and reported user details
- Timestamps

**Resolve Report** (`/resolve <id> <action> [notes]`):
**Actions**:
- `none` - False report, no action taken
- `warned` - User warned
- `muted` - User muted
- `banned` - User banned
- `kicked` - User kicked from lobby
- `media_restricted` - User media-restricted

**Resolution Process**:
1. Validate report exists and is pending
2. Execute action if not 'none'
3. Update report:
   - Set `status: 'resolved'`
   - Record `resolvedBy`, `resolutionAction`, `resolutionNotes`
   - Set `resolvedAt` timestamp
4. Notify reporter of resolution
5. Create audit log entry

**Features**:
- Anonymous to reported user (doesn't know who reported)
- Reporter notified of resolution
- Full moderation history
- Context preservation (message preview)
- Reason field for context

**Moderation Accountability**:
- All resolutions logged in AuditLog
- Tracks which mod resolved which reports
- Resolution notes for future reference
- Statistics on resolution actions

**User Experience**:
- Simple report submission (reply + command)
- Clear feedback to reporter
- Timely resolution
- Reporter notified when resolved

---

### Content Filters

**Purpose**: Block messages matching keywords or regex patterns.

**Files**: `src/commands/admin/filters.js`, `src/models/Filter.js`

**How It Works**:

1. **Filter Creation** (`/filter add <pattern> [notes]`):
   - Parse pattern
   - Detect if regex (contains regex special chars)
   - Create Filter document
   - Set `active: true`, `action: 'block'`

2. **Message Filtering**:
   - Before relay, fetch all active filters
   - Check message text and caption against each filter
   - Pattern matching:
     - Keyword: Case-insensitive substring match
     - Regex: JavaScript RegExp test
   - If match found:
     - **Block action**: Prevent relay, notify user with reason
     - **Notify action**: Relay message, notify admins

3. **Filter Management**:
   - `/filter list` - View all filters
   - `/filter remove <id>` - Delete filter
   - `/filter toggle <id>` - Enable/disable without deletion

**Features**:
- Keyword or regex patterns
- Active/inactive toggle
- Block or notify actions
- Internal notes for admin reference
- Exemptions: admin, mod, whitelist role

**Pattern Examples**:
- Keyword: `badword` → matches "badword", "Badword", "BADWORD"
- Regex: `https?://spam\.com` → matches URLs containing "spam.com"
- Regex: `\b(bad|offensive|inappropriate)\b` → matches whole words

**Integration**:
- Checked in `src/handlers/relayHandler.js` before relay
- After slowmode check, before message formatting
- Logged when message blocked
- User notified with reason

**Admin Management**:
- List shows pattern, active status, creation info
- Easy toggle without deletion
- Notes for tracking filter purpose
- Can identify which filter blocked message

**User Experience**:
- Clear feedback when message blocked
- Filter pattern shown (if not sensitive)
- Can rephrase and retry
- Exemptions for trusted users

---

### Slowmode

**Purpose**: Rate limit messages to prevent spam and flooding.

**Files**: `src/commands/admin/slowmode.js`, `src/models/Setting.js`

**How It Works**:

1. **Enable Slowmode** (`/slowmode <seconds>`):
   - Validate seconds (1-3600)
   - Update Setting document: `slowmodeEnabled: true`, `slowmodeSeconds: N`
   - Announce to lobby

2. **Message Rate Limiting**:
   - Before relay, check if slowmode enabled
   - Check user's last message timestamp (from Activity)
   - Calculate time since last message
   - If less than `slowmodeSeconds`:
     - Reject message
     - Notify user with remaining time
   - Otherwise, allow relay and update timestamp

3. **Disable Slowmode** (`/slowmode off`):
   - Update Setting document: `slowmodeEnabled: false`
   - Announce to lobby

4. **Check Status** (`/slowmode`):
   - Display current slowmode status and delay

**Exemptions**:
- Admin role
- Mod role
- Whitelist role

**Features**:
- Configurable delay (1 second to 1 hour)
- Clear feedback with countdown
- Role-based exemptions
- Lobby-wide announcement of changes

**User Experience**:
- Clear error message when rate limited
- Countdown to next allowed message
- Understanding that mods/admins exempt
- Helps prevent flood spam

**Technical Details**:
- Uses `Activity.lastActive` for timestamp
- Atomic check and update
- No race conditions
- Setting stored in global singleton document

---

### Audit Log System

**Purpose**: Persistent record of all moderation and admin actions.

**Files**: `src/commands/admin/auditlog.js`, `src/models/AuditLog.js`

**Tracked Actions** (41+ types):

**User Moderation**:
- ban, unban, mute, unmute, kick, warn
- media_restrict, media_unrestrict

**Role Management**:
- promote, demote, whitelist, unwhitelist
- role_create, role_update, role_delete, role_assign, role_revoke

**Content Moderation**:
- filter_add, filter_remove, filter_toggle
- message_delete

**Configuration**:
- slowmode_enable, slowmode_disable
- invite_mode_on, invite_mode_off
- welcome_enable, welcome_disable
- maintenance_on, maintenance_off

**Invites**:
- invite_create, invite_revoke, invite_activate, invite_delete

**Reports**:
- report_resolve

**Spam**:
- antispam_config, antispam_whitelist, antispam_unwhitelist
- antispam_reset, antispam_clear

**Announcements**:
- announce_lobby, announce_all
- schedule_create, schedule_delete, schedule_pause, schedule_resume

**Data Management**:
- export_users, export_messages, export_full

**Log Creation**:

**Automatic**:
- All admin/mod commands create log entry
- Called via `createAuditLog(action, moderatorId, targetId, details, reason)`
- Includes moderator alias, target alias, timestamp

**Manual**:
- Can create logs programmatically for custom events
- Flexible `details` object for action-specific data

**Viewing Logs** (`/auditlog` or `/audit`):

**Default View**:
- Last 20 entries
- Shows: timestamp, action, moderator, target, reason
- Paginated

**Filters**:
- By action: `/auditlog ban`
- By target: `/auditlog user SomeUser`
- By moderator: `/auditlog mod ModName`
- Pagination: `/auditlog 2` (page 2)

**Features**:
- Permanent record (no auto-cleanup)
- Full accountability
- Detailed action tracking
- Flexible details storage
- Easy filtering and searching

**Moderation Accountability**:
- Who performed action
- When action performed
- Why action performed (reason field)
- What action performed (details object)
- Audit trail for disputes

**Performance**:
- Indexed by action, targetId, moderatorId, timestamp
- Fast filtering and pagination
- Efficient chronological queries

---

## Access Control

### Invite System

**Purpose**: Controlled lobby access via invite codes.

**Files**:
- `src/commands/invitesAdmin.js` - Admin management
- `src/models/Invite.js` - Invite storage
- `src/models/Setting.js` - Invite-only mode toggle

**Invite-Only Mode**:

**Enable** (`/invite_on`):
- Sets `Setting.inviteOnly: true`
- Users must provide valid invite code to join
- `/join` without code rejected

**Disable** (`/invite_off`):
- Sets `Setting.inviteOnly: false`
- Users can join freely with `/join`

**Invite Code Management**:

**Create Invite** (`/invite_new <uses> <expiry> <notes>`):
**Parameters**:
- `uses`: Max uses (0 = unlimited)
- `expiry`: Duration (`7d`, `24h`, `30m`) or date (`2025-12-31`)
- `notes`: Internal description

**Process**:
1. Parse uses and expiry
2. Generate cryptographically secure random code
3. Create Invite document
4. Return code to admin for sharing

**Usage Flow**:
1. User tries `/join` in invite-only mode
2. Bot prompts for invite code
3. User uses `/join CODE123`
4. Bot validates code:
   - Exists and active
   - Not expired
   - Not exhausted (uses < maxUses)
5. If valid:
   - Add user to lobby
   - Increment `uses` counter
   - Add to `usedBy` array
   - Success message

**Invite Management**:
- `/invite_list` - View all invites with status
- `/invite_revoke <code>` - Deactivate (set `active: false`)
- `/invite_activate <code>` - Reactivate (set `active: true`)
- `/invite_delete <code>` - Permanently delete

**Invite States**:
- **Active**: Can be used (`active: true`, not expired, uses < maxUses)
- **Revoked**: Manually deactivated (`active: false`)
- **Expired**: Past `expiresAt` date
- **Exhausted**: `uses >= maxUses`

**Features**:
- Secure random code generation
- Flexible expiry (relative or absolute)
- Usage tracking (who used, when)
- Reactivation of revoked invites
- Unlimited use invites (maxUses: 0)

**Admin Experience**:
- Easy code generation
- Full tracking and management
- Internal notes for organization
- View usage statistics

**User Experience**:
- Simple `/join CODE` command
- Clear error messages for invalid codes
- Immediate lobby access on valid code

**Security**:
- Cryptographically secure random codes
- No predictable patterns
- Expiry enforcement
- Usage limits

---

### Link Whitelisting

**Purpose**: Allow specific domains/URLs to bypass link spam detection.

**Files**: `src/models/LinkWhitelist.js`, `src/commands/admin/linkWhitelist.js`

**How It Works**:

1. **Whitelist Entry**:
   - Admin adds domain or URL pattern
   - Stored as keyword or regex
   - Internal notes for tracking

2. **Link Spam Check**:
   - Extract URLs from message
   - Check each URL against whitelist
   - If match found → exempt from spam detection
   - Otherwise → apply link spam rules

3. **Pattern Types**:
   - Domain: `github.com` → matches any github.com URL
   - Full URL: `https://specific-site.com/path` → exact match
   - Regex: `https?://trusted\.(com|org)` → pattern match

**Admin Commands** (commands to be verified from codebase):
- Add whitelist entry
- Remove whitelist entry
- List whitelisted domains
- Toggle active/inactive

**Use Cases**:
- Community resources (documentation, shared files)
- Official links (project repos, websites)
- Trusted partners
- Internal services

**Integration**:
- Checked before link spam detection
- Early exit prevents false positives
- Logged for transparency

---

### Permissions System

**Purpose**: Granular permission control beyond roles.

**Files**: `src/commands/utils/permissions.js`, `src/services/roleService.js`

**Permission Structure**:

**Built-in Permissions**:
- Can view audit logs
- Can manage users (ban, mute, kick)
- Can manage content (delete, filter)
- Can configure bot (settings, slowmode)
- Can manage invites
- Can view reports
- Can manage roles
- Can post links
- Can send media
- And more...

**Permission Checking**:

**Role-Based**:
- Admin: All permissions
- Mod: Subset of permissions
- Whitelist: Exemptions only
- Custom roles: Configured permissions

**Individual**:
- User can have specific permissions
- Override role permissions
- Useful for temporary access

**Function**: `withRole(requiredRoles)`
- Middleware for command access control
- Checks user role against required roles
- Returns error if insufficient permissions

**Integration**:
- Command handlers use `withRole()` wrapper
- Permission checks before actions
- Clear error messages

**User View** (`/myperms`):
- List all active permissions
- Shows source (role or individual)
- Helps users understand access level

**Future Enhancements**:
- Fine-grained permission toggles
- Permission groups
- Temporary permission grants
- Permission audit log

---

### Custom Roles

**Purpose**: Flexible role system with custom permissions.

**Files**: `src/models/CustomRole.js`, `src/commands/admin/roleCommands.js`, `src/services/roleService.js`

**System Roles**:
- **admin**: Full access, cannot be deleted
- **mod**: Moderator permissions, cannot be deleted
- **whitelist**: Exemptions, cannot be deleted

**Custom Roles**:

**Creation**:
- Define name, display name, icon, color
- Assign permissions from available set
- Set priority for display order

**Assignment**:
- Users can have multiple custom roles
- Additive permissions (union of all roles)
- Highest priority role shown in profile

**Management**:
- Create, update, delete custom roles
- Assign/revoke roles to/from users
- View role members
- Configure permissions per role

**Permissions Array**:
- Array of permission strings
- Checked against required permissions
- Extensible for new permissions

**Display**:
- Icon and color for visual identification
- Priority determines badge order
- Shown in profiles and leaderboards

**Dashboard Integration**:
- Visual role editor
- Drag-and-drop priority
- Permission checkboxes
- Live preview

**Use Cases**:
- VIP members (special badge, no restrictions)
- Trial moderators (limited mod permissions)
- Content creators (post links, no slowmode)
- Verified users (trusted, no spam checks)

**Deprecation**:
- `/promote` and `/demote` commands deprecated
- Replaced by custom role system
- More flexible and granular

---

## Administrative Features

### Scheduled Announcements

**Purpose**: Automated announcements (one-time and recurring).

**Files**: `src/commands/admin/schedule.js`, `src/models/ScheduledAnnouncement.js`

**Two Types**:

#### 1. One-Time Announcements
**Creation** (`/schedule create once <time> <message>`):
**Time Formats**:
- Absolute: `14:30`, `tomorrow 14:30`, `2025-11-05 14:30`
- Relative: `30m`, `2h`, `1d`

**Example**:
```
/schedule create once 2h Server maintenance starting --all
```

#### 2. Recurring Announcements
**Creation** (`/schedule create recurring <preset|pattern> <message>`):
**Presets**:
- `daily-9am`, `daily-12pm`, `daily-6pm`, `daily-midnight`
- `weekly-monday`, `weekly-friday`, `weekly-sunday`
- `hourly`, `every-3h`, `every-6h`

**Custom Cron**:
- Standard cron pattern: `* * * * *` (minute hour day month weekday)
- Example: `0 9 * * 1-5` → Weekdays at 9am

**Example**:
```
/schedule create recurring daily-9am Good morning, lobby! --notes="Daily greeting"
```

**Options**:
- `--all`: Send to all registered users (default: lobby only)
- `--notes="text"`: Internal notes for tracking

**Management**:

**List** (`/schedule list`):
- All scheduled announcements
- Type, status, schedule, next run
- Sent count and last sent

**View** (`/schedule view <id>`):
- Full announcement details
- Message content
- Schedule/cron pattern
- Execution history

**Pause/Resume**:
- `/schedule pause <id>` - Temporarily disable
- `/schedule resume <id>` - Reactivate

**Delete** (`/schedule delete <id>`):
- Permanently remove announcement

**Test** (`/schedule test <id>`):
- Send to yourself only
- Preview formatting and content

**Execution**:

**Cron Scheduler**:
- Runs in bot process
- Checks every minute for due announcements
- Executes matching schedules

**One-Time**:
- Executed at `scheduledFor` time
- Automatically deactivated after execution
- Remains in database for history

**Recurring**:
- Executed per cron pattern
- Continues until paused or deleted
- Updates `lastSent` and `sentCount`

**Features**:
- HTML formatting support
- Execution history tracking
- Flexible scheduling
- Lobby or all users
- Pause without deletion

**Use Cases**:
- Daily greetings/reminders
- Weekly announcements
- Event reminders
- Maintenance notices
- Rules reminders

**Technical Details**:
- Uses `node-cron` package
- Cron jobs initialized on bot startup
- Jobs updated on schedule changes
- Persistent across restarts

---

### Statistics Dashboard

**Purpose**: Comprehensive lobby analytics and insights.

**Files**: `src/commands/admin/stats.js`

**Statistics Types**:

#### 1. Overall Stats (`/stats`)
**Metrics**:
- **User counts**:
  - Total registered
  - Currently in lobby
  - Active (sent message today)
  - Participation rate (active/total %)
- **Message metrics**:
  - Total messages all-time
  - Today, this week, this month
  - Text vs media breakdown
  - Average per user
- **Activity insights**:
  - Top 5 contributors
  - Most active hour/day
  - Engagement level
- **Moderation summary** (last 30 days):
  - Bans, mutes, kicks from audit log
  - Warnings issued
  - Reports resolved
- **Real-time status**:
  - Online users
  - Idle users

#### 2. User-Specific Stats (`/stats user <alias>`)
**Metrics**:
- Join date and tenure
- Total messages and rank
- Text vs media breakdown
- Reply count
- Activity pattern (hourly distribution)
- Moderation history
- Current status and restrictions

#### 3. Time-Based Analysis (`/stats period <day|week|month>`)
**Shortcuts**: `/stats day`, `/stats week`, `/stats month`
**Metrics**:
- Message count for period
- Most active users
- Text vs media breakdown
- Comparison to previous period
- Growth/decline percentage
- Hourly activity distribution

**Caching**:
- 5-minute cache for overall stats
- Prevents database overload
- Fresh data every 5 minutes
- Cache invalidated on data changes

**Features**:
- Real-time activity status
- Historical comparisons
- Engagement insights
- Moderation overview
- Top contributor identification

**Admin Use Cases**:
- Monitor lobby health
- Identify inactive users
- Track growth trends
- Evaluate moderation workload
- Plan engagement activities

**User Use Cases**:
- Personal statistics
- Compare to others
- Track own activity
- See lobby trends

**Performance**:
- Aggregation queries
- Indexed fields for fast counts
- Caching for repeated queries
- Batch user lookups

**Technical Details**:
- MongoDB aggregation pipeline
- Activity model joins
- Date range filtering
- Percentage calculations

---

### Welcome Messages

**Purpose**: Automatic greeting for new lobby members.

**Files**: `src/commands/admin/welcome.js`, `src/models/Setting.js`

**How It Works**:

**Enable** (`/welcome on [message]`):
- Sets `Setting.welcomeEnabled: true`
- Optionally sets custom `welcomeMessage`
- If no message provided, uses default

**Set Message** (`/welcome set <message>`):
- Updates `Setting.welcomeMessage`
- Supports HTML formatting
- Can include placeholders (future: {alias}, {lobby_count})

**Disable** (`/welcome off`):
- Sets `Setting.welcomeEnabled: false`
- Retains message for future use

**Check Status** (`/welcome`):
- Shows current enabled/disabled status
- Displays current message

**Default Message**:
```
Welcome to the lobby!

Read /rules and enjoy your stay!
```

**Integration**:
- Triggered when user joins lobby
- Checked after successful `/join`
- Sent privately to new member
- Not announced to lobby

**Features**:
- HTML formatting (bold, italic, links)
- Customizable per lobby
- Enable/disable toggle
- Default message provided

**Use Cases**:
- Greeting new members
- Pointing to rules
- Community guidelines
- Getting started info
- Links to resources

**User Experience**:
- Immediate welcome
- Clear next steps
- Friendly first impression

**Technical Details**:
- Stored in global Setting document
- HTML parsed by Telegram
- Sent via `ctx.telegram.sendMessage()`

---

### Maintenance Mode

**Purpose**: Temporarily disable bot for non-admins.

**Files**: `src/commands/admin/maintenance.js`, `src/models/Setting.js`

**How It Works**:

**Enable** (`/maintenance on`):
- Sets `Setting.maintenanceMode: true`
- Non-admin commands blocked
- Maintenance message shown

**Disable** (`/maintenance off`):
- Sets `Setting.maintenanceMode: false`
- Normal operation resumes

**Check Status** (`/maintenance`):
- Shows current mode
- Displays maintenance message

**Integration**:
- Middleware check on all commands
- Early exit for non-admins
- Admins can still use bot

**Maintenance Message**:
- Default: "Bot is under maintenance. Please try again later."
- Customizable (future feature)
- Shown to all non-admin users

**Features**:
- Quick enable/disable
- Admin access maintained
- Clear user messaging
- Prevents interruptions during updates

**Use Cases**:
- Server maintenance
- Bot updates
- Database migrations
- Emergency fixes
- Testing new features

**User Experience**:
- Clear maintenance message
- Not confused with downtime
- Knows to try again later

**Admin Experience**:
- Full access for testing
- Can verify fixes
- No user interruption

**Technical Details**:
- Global setting check
- Middleware pattern
- Stored in Setting document

---

### Blocked Bot Detection

**Purpose**: Identify and manage users who blocked the bot.

**Files**: `src/commands/admin/blocked.js`, User model

**How It Works**:

**Detection**:
- Bot attempts to send message
- Telegram returns HTTP 403 Forbidden
- Error handler catches 403
- Updates User: `blockedBot: true`, `blockedAt: Date.now()`
- Automatically removes from lobby if in lobby
- Notifies dashboard via WebSocket (`user:blocked` event)

**Admin Commands**:

**View Blocked Users** (`/blocked`):
- List all users with `blockedBot: true`
- Shows: alias, blocked date, was in lobby
- Paginated list

**Cleanup** (`/blocked cleanup`):
- Removes blocked users from database
- Prompts for confirmation
- Shows count before deletion
- Permanent action

**Dashboard Integration**:
- Real-time notification when user blocks bot
- `user:blocked` WebSocket event
- Dashboard shows blocked user list
- Admin can view from web interface

**Use Cases**:
- Identify inactive users
- Clean up database
- Track lobby departures
- Analytics on user retention

**Automatic Cleanup** (future):
- Scheduled task to remove old blocked users
- Configurable retention period
- Logged in audit trail

**Privacy Consideration**:
- Only admins can see blocked users
- Not announced to lobby
- Used for maintenance only

**Technical Details**:
- Error code 403 detection
- User document update
- Lobby removal transaction
- WebSocket event emission

---

## Infrastructure

### Compliance System

**Purpose**: Enforce activity and media requirements.

**Files**: `src/users/compliance.js`

**Three Rules**:

#### 1. First 24 Hours Rule
**Requirement**: Send 10 media items within first 24 hours
**Tracking**:
- `Activity.mediaCount.first24h` incremented on media send
- Join timestamp from `User.createdAt`
- Checked at midnight if registered in last 24 hours

**Violation**: Warning issued if < 10 media

#### 2. Daily Media Rule
**Requirement**: Send at least 1 media item per day
**Tracking**:
- `Activity.mediaCount.byDate[YYYY-MM-DD]` for each day
- Checked at midnight for yesterday's date
- Only checks users who were in lobby yesterday

**Violation**: Warning issued if 0 media for previous day

#### 3. Inactivity Rule
**Requirement**: Send message within 2 days
**Tracking**:
- `Activity.lastActive` timestamp
- Checked at midnight
- Calculates days since last activity

**Violation**: Auto-kick if > 2 days inactive

**Warning System**:

**Enforcement**:
- Each violation adds 1 warning
- Warnings stored in `User.warnings`
- 3 warnings = permanent ban
- Ban executed automatically
- User notified of warning and count

**Exemptions**:
- Admin role → exempt from all rules
- Mod role → exempt from all rules
- Whitelist role → exempt from all rules

**Execution Schedule**:

**Daily at Midnight**:
- Cron job: `0 0 * * *`
- Runs compliance check function
- Batch queries for performance
- Processes all lobby members

**Batch Processing**:
- Fetch all lobby users once
- Fetch all activities once
- Process in memory
- Bulk updates at end

**User Notifications**:

**Warning Message**:
- Sent privately to user
- Explains violation
- States warning count
- Explains consequences (3 = ban)

**Ban Message**:
- Sent before ban executed
- Explains ban reason
- Permanent restriction notice

**Features**:
- Automatic enforcement
- Fair warning system
- Role-based exemptions
- Clear communication
- Batch processing for performance

**Admin Override**:
- Admins can manually reset warnings
- Admins can exempt specific users via whitelist
- Audit log tracks exemptions

**Technical Details**:
- Uses `node-cron` for scheduling
- Batch queries avoid N+1
- Atomic updates
- Transaction safety

---

### Enhanced Logging

**Purpose**: Structured logging for debugging and monitoring.

**Files**: `src/utils/logger.js`, `src/services/dashboardLogger.js`

**Logging System**:

**Winston-Based**:
- Structured JSON logging
- Multiple transports:
  - Console (development)
  - File rotation (production)
  - Dashboard HTTP (live logging)

**Log Levels**:
- `error`: Errors and exceptions
- `warn`: Warnings and deprecations
- `info`: General information
- `debug`: Detailed debugging (development only)

**File Rotation**:
- Daily log files
- Format: `logs/bot-YYYY-MM-DD.log`
- Automatic rotation at midnight
- 30-day retention (configurable)
- Compressed old logs

**Log Categories**:
- `error`: Application errors
- `warning`: Non-fatal warnings
- `info`: General information
- `relay_failure`: Failed message relays
- `rate_limit`: Rate limit encounters
- `user_blocked`: User blocked bot
- `system_health`: System metrics
- `user_action`: User commands/actions

**Dashboard Integration**:

**Live Logging**:
- Logs streamed to dashboard via HTTP
- Batched requests for efficiency
- 30-day TTL in BotLog collection
- Real-time WebSocket updates

**Batch Sending**:
- Groups logs every 5 seconds
- Single HTTP POST with array
- Retry logic on failure
- Queue persistence

**WebSocket Events**:
- `bot:log` - General logs
- `bot:error` - Error logs
- `relay:failure` - Relay failures
- `user:blocked` - User blocked bot
- `system:health` - Health metrics

**Error Aggregation**:

**Rate Limiting**:
- Max 5 error notifications per minute
- Prevents notification spam
- 5-minute cooldown per unique error
- Error signature based on message + stack

**Error Grouping**:
- Groups similar errors
- Tracks occurrence count
- First and last seen timestamps

**Features**:
- Structured logging
- Automatic file rotation
- Dashboard live streaming
- Error aggregation
- Performance monitoring
- Debugging support

**Usage**:
```javascript
logger.info('User joined lobby', { userId, alias });
logger.error('Relay failed', { error, userId, recipientId });
logger.warn('Rate limit encountered', { retryAfter });
```

**Performance**:
- Async logging (non-blocking)
- Batched dashboard requests
- Efficient JSON serialization
- Minimal overhead

---

### Metrics Collection

**Purpose**: Anonymous usage metrics for improvement.

**Files**: `src/metrics/collect.js`, `src/metrics/sender.js`, `src/models/Instance.js`

**Opt-In System**:
- Controlled via `METRICS_ENABLED` env variable
- Default: disabled
- Completely anonymous
- No personal data collected

**Collected Metrics**:

**Instance Info**:
- Instance ID (random UUID or from env)
- Bot version
- Start time
- Environment (production/development)

**Usage Statistics**:
- Total registered users
- Users in lobby
- Total messages relayed
- Uptime

**No Personal Data**:
- No user IDs
- No aliases
- No message content
- No IP addresses

**Collection Schedule**:

**Daily at Midnight**:
- Cron job: `0 0 * * *`
- Collects current statistics
- Sends to metrics API
- Updates Instance document

**Metrics API**:
- Configurable endpoint via `METRICS_API_URL`
- Default: Official Anthropic metrics endpoint
- Self-hosted option available
- HTTP POST with JSON payload

**Instance Tracking**:

**Instance Document**:
- Unique ID per bot instance
- Tracks multiple instances
- Heartbeat system
- Version tracking

**Purpose**:
- Understand usage patterns
- Identify common issues
- Prioritize features
- Monitor adoption

**Privacy**:
- Completely anonymous
- Opt-in only
- No PII collected
- Transparent data usage

**Self-Hosting**:
- Can disable entirely
- Can point to own metrics endpoint
- Full control over data

**Technical Details**:
- Axios for HTTP requests
- Error handling (silent failure)
- Retry logic
- JSON payload

---

### Error Handling

**Purpose**: Robust error handling and recovery.

**Files**: `src/utils/telegramErrorHandler.js`, `src/utils/messageSplitter.js`

**Global Error Handler**:

**Bot-Level** (`src/index.js`):
- Catches all unhandled bot errors
- Sends crash report to admin
- Logs full stack trace
- Attempts graceful recovery

**Error Notification**:
- Sent to `ADMIN_ID`
- Optional separate `ERROR_NOTIFICATION_ID`
- Rate limited: 5 per minute
- 5-minute cooldown per unique error

**Telegram Error Handling**:

**HTTP Error Codes**:

**429 - Rate Limit**:
- Extract `retry_after` from response
- Exponential backoff: 1s → 2s → 4s → 8s
- Automatic retry
- Used in `sendWithRetry()`

**403 - Forbidden (Blocked Bot)**:
- Mark user as `blockedBot: true`
- Remove from lobby
- Stop delivery attempts
- Notify dashboard

**400 - Bad Request**:
- Common: Invalid reply reference
- Retry without reply
- Fallback to non-threaded message
- Log for debugging

**Other Errors**:
- Log error
- Skip recipient
- Continue with other recipients
- Don't fail entire relay

**Message Length Handling**:

**4096 Character Limit**:
- Telegram max message length
- Automatic splitting in `messageSplitter.js`
- Preserves HTML formatting
- Splits on word boundaries

**Splitting Logic**:
- Split at 4000 chars (buffer)
- Find last space/newline
- Add continuation indicators
- Send as multiple messages

**Graceful Degradation**:

**Reply Threading**:
- If reply target not found → send without reply
- If QuoteLink expired → fall back to RelayedMessage
- If both fail → send as regular message

**Media Handling**:
- If file_id invalid → request fresh upload
- If file too large → notify user
- If file type unsupported → graceful error

**Database Operations**:
- Connection error → retry with backoff
- Duplicate key → handle uniqueness violation
- Timeout → extend deadline and retry

**Features**:
- Comprehensive error catching
- Graceful recovery
- User-friendly error messages
- Admin notifications
- Detailed logging

**User Experience**:
- Clear error messages
- Automatic retries
- No silent failures
- Helpful suggestions

**Technical Details**:
- Try-catch blocks throughout
- Async error handling
- Promise rejection handling
- Graceful shutdown on critical errors

---

## Related Documentation

- [Command Reference](./COMMANDS.md) - All bot commands
- [Model Reference](./MODELS.md) - Database schemas
- [Dashboard Documentation](./DASHBOARD.md) - Dashboard/API architecture
