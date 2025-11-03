# 🎭 SecretLoungeBot (Telegram Lobby Bot)

> An anonymous Telegram chat lobby bot that enables users to communicate anonymously through customizable aliases and emoji avatars.

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](CHANGELOG.md)
[![License](https://img.shields.io/badge/license-ISC-green.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node.js-%3E%3D16.0.0-brightgreen.svg)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/mongodb-required-47A248.svg)](https://www.mongodb.com/)

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Quick Start](#-quick-start)
- [Command Reference](#-command-reference)
  - [User Commands](#user-commands)
  - [Moderator Commands](#moderator-commands)
  - [Admin Commands](#admin-commands)
- [How It Works](#-how-it-works)
- [Compliance & Auto-Moderation](#-compliance--auto-moderation)
- [Development](#-development)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Overview

**SecretLoungeBot** creates an anonymous chat lobby in Telegram where users can communicate without revealing their identity. Users register with custom aliases and emoji avatars, join a shared lobby, and send messages that are relayed to all other members while preserving complete anonymity.

### Key Features

✨ **Anonymous Communication** - Users communicate through custom aliases and emoji icons
🔒 **Privacy Controls** - Private blocking system, GDPR-compliant data deletion
🎨 **Customization** - Custom emojis (Premium users) with fallback support, user preferences
📊 **Community Features** - Polls, leaderboards, user profiles, achievement badges, native message reactions
🛡️ **Advanced Moderation** - Reports, warnings, mute/ban system, content filters, anti-spam
🎫 **Invite System** - Optional invite-only mode with code generation
📜 **Chat History** - View recent lobby messages (last 50 from past 12 hours)
📌 **Native Pinned Messages** - Pin lobby messages or announcements at top of chat (max 5)
💬 **Native Reactions** - React to messages using Telegram's built-in reactions, synced across all users
⚙️ **Auto-Moderation** - Compliance rules, activity tracking, slowmode, spam detection
⚡ **User Preferences** - Customize your experience with compact mode, hide announcements

---

## 📦 Prerequisites

Before you begin, ensure you have the following installed and set up:

### 1. Node.js (v16.0.0 or higher)

**Install Node.js:**

- **Windows/macOS**: Download from [nodejs.org](https://nodejs.org/)
- **Linux (Ubuntu/Debian)**:
  ```bash
  curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
  sudo apt-get install -y nodejs
  ```
- **macOS (Homebrew)**:
  ```bash
  brew install node
  ```

**Verify installation:**

```bash
node --version  # Should show v16.0.0 or higher
npm --version   # Should show 7.0.0 or higher
```

### 2. MongoDB Database

You need a MongoDB database. Choose one option:

#### Option A: MongoDB Atlas (Cloud - Recommended for beginners)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
2. Create a free account
3. Create a new cluster (Free tier available)
4. Click "Connect" → "Connect your application"
5. Copy the connection string (looks like `mongodb+srv://username:password@cluster.mongodb.net/`)
6. Replace `<password>` with your database password
7. Add your IP address to the whitelist (or allow from anywhere: `0.0.0.0/0`)

#### Option B: Local MongoDB Installation

- **Windows**: Download from [mongodb.com/try/download/community](https://www.mongodb.com/try/download/community)
- **macOS (Homebrew)**:
  ```bash
  brew tap mongodb/brew
  brew install mongodb-community
  brew services start mongodb-community
  ```
- **Linux (Ubuntu/Debian)**:
  ```bash
  wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
  echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
  sudo apt-get update
  sudo apt-get install -y mongodb-org
  sudo systemctl start mongod
  ```

**Local connection string**: `mongodb://localhost:27017/`

### 3. Telegram Bot Token

**Create a Telegram bot and get your token:**

1. Open Telegram and search for [@BotFather](https://t.me/BotFather)
2. Start a conversation and send `/newbot`
3. Follow the prompts:
   - Choose a name for your bot (e.g., "My Lobby Bot")
   - Choose a username ending in "bot" (e.g., "mylobby_bot")
4. **Copy the bot token** (looks like `123456789:ABCdefGhIjKlmNoPqRsTuVwXyZ`)
5. **Important**: Keep this token secret!

### 4. Your Telegram User ID

**Get your Telegram user ID (for admin access):**

1. Open Telegram and search for [@userinfobot](https://t.me/userinfobot)
2. Start the bot
3. **Copy your User ID** (looks like `123456789`)

---

## 🚀 Installation

### Step 1: Clone the Repository

```bash
git clone <your-repository-url>
cd SecretLoungeBot
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install all required packages:

- `telegraf` - Telegram bot framework
- `mongoose` - MongoDB ODM
- `winston` - Logging system
- `dotenv` - Environment configuration

### Step 3: Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your favorite text editor and fill in the required values:

```bash
nano .env  # or vim, code, notepad, etc.
```

---

## ⚙️ Configuration

### Required Environment Variables

Edit your `.env` file and set these **required** values:

```env
# Telegram Bot Configuration (REQUIRED)
BOT_TOKEN=123456789:ABCdefGhIjKlmNoPqRsTuVwXyZ  # From @BotFather

# Admin Configuration (REQUIRED)
ADMIN_ID=123456789  # Your Telegram User ID from @userinfobot

# Database Configuration (REQUIRED)
MONGO_URI=mongodb://localhost:27017/  # Or your MongoDB Atlas connection string
DBNAME=lobbyBot  # Database name (you can change this)
```

### Optional Environment Variables

```env
# Error Notifications (Optional - defaults to ADMIN_ID)
ERROR_NOTIFICATION_ID=123456789

# Anonymous Metrics (Optional - helps improve the bot)
METRICS_ENABLED=true  # Set to false to disable
METRICS_API_URL=https://your-metrics-endpoint.com  # Override default endpoint
INSTANCE_ID=my-lobby-bot  # Unique identifier for this instance
```

### Configuration Notes

- **BOT_TOKEN**: Get this from @BotFather (see Prerequisites)
- **ADMIN_ID**: Your Telegram user ID - gives you full admin access
- **MONGO_URI**:
  - Local: `mongodb://localhost:27017/`
  - Atlas: `mongodb+srv://username:password@cluster.mongodb.net/`
- **DBNAME**: Choose any name for your database (default: `lobbyBot`)
- **METRICS_ENABLED**: Anonymous usage metrics help improve the bot (opt-in)

---

## 🏁 Quick Start

### Step 1: Start the Bot

```bash
npm start
```

You should see output like:

```
[INFO] MongoDB connected successfully
[INFO] Bot started successfully as @your_bot_username
[INFO] Bot is running... Press Ctrl+C to stop
```

### Step 2: Initial Setup (As Admin)

1. **Open Telegram** and search for your bot (@your_bot_username)
2. **Start the bot**: Send `/start`
3. **Register yourself**: Send `/join`
4. **Set your alias**: `/alias YourName`
5. **Set your icon**: `/icon 🎭`

### Step 3: Configure Lobby (Optional)

**Set lobby rules:**

```
/rules_add 1️⃣ Be respectful to all members
/rules_add 2️⃣ No spam or harassment
/rules_add 3️⃣ Keep content appropriate
```

**Enable invite-only mode (optional):**

```
/invite_on
/invite_new 10 7d Welcome to the lobby!
```

### Step 4: Invite Users

**If invite-only is OFF:**

- Users can join directly with `/join`

**If invite-only is ON:**

- Share invite codes with `/invite_list`
- Users join with `/join CODE`

### Step 5: Start Chatting!

- Send any message to the bot - it will be relayed to all lobby members
- Messages appear with your icon and alias (e.g., "🎭 YourName: Hello!")
- Reply to messages for threaded conversations

---

## 📖 Command Reference

### User Commands

#### 🎨 Identity & Profile

| Command                   | Aliases                | Description                            | Example                        |
| ------------------------- | ---------------------- | -------------------------------------- | ------------------------------ |
| `/start`                  | -                      | Initialize bot and see welcome message | `/start`                       |
| `/alias <name>`           | `/setalias`, `/rename` | Set your display name (2-32 chars)     | `/alias Anonymous`             |
| `/icon <emoji>`           | -                      | Set your avatar emoji                  | `/icon 🎭`                     |
| `/profile [alias\|reply]` | -                      | View detailed user statistics          | `/profile` or `/profile Alice` |
| `/tenure`                 | -                      | View lobby membership duration         | `/tenure`                      |
| `/version`                | `/v`                   | Display bot version and uptime         | `/version`                     |

#### 🚪 Lobby Participation

| Command        | Aliases | Description                                | Example                   |
| -------------- | ------- | ------------------------------------------ | ------------------------- |
| `/join [code]` | `/j`    | Join the lobby (with optional invite code) | `/join` or `/join ABC123` |
| `/leave`       | `/l`    | Leave the lobby                            | `/leave`                  |
| `/online`      | `/o`    | Show count of active users                 | `/online`                 |
| `/rules`       | -       | View lobby rules and guidelines            | `/rules`                  |

#### 💬 Messaging & Communication

| Command                  | Aliases | Description                              | Example                   |
| ------------------------ | ------- | ---------------------------------------- | ------------------------- |
| `/msg <alias> <message>` | `/dm`   | Send private anonymous message           | `/msg Alice Hello there!` |
| `/sign <message>`        | `/s`    | Sign message with your Telegram username | `/sign This is me!`       |
| `/history`               | -       | View last 50 messages from past 12 hours | `/history`                |

#### 🔒 Privacy & Blocking

| Command                   | Aliases | Description                              | Example                               |
| ------------------------- | ------- | ---------------------------------------- | ------------------------------------- |
| `/block <alias\|reply>`   | -       | Block a user privately (no notification) | `/block Alice` or reply with `/block` |
| `/unblock <alias\|reply>` | -       | Unblock a user                           | `/unblock Alice`                      |
| `/blocklist`              | -       | View all blocked users                   | `/blocklist`                          |

#### 🎪 Community Features

| Command                                               | Aliases       | Description                                      | Example                                                               |
| ----------------------------------------------------- | ------------- | ------------------------------------------------ | --------------------------------------------------------------------- |
| `/poll [flags] <question> \| <opt1> \| <opt2> \| ...` | -             | Create poll with advanced features (2-6 options) | `/poll --multi --expires=1h What features? \| Feature A \| Feature B` |
| `/endpoll`                                            | -             | Close your most recent active poll               | `/endpoll`                                                            |
| `/editpoll <pollId> <field> <value>`                  | -             | Edit poll question or options (if editable)      | `/editpoll 123abc question New question?`                             |
| `/pollresults <pollId>`                               | -             | View detailed poll results                       | `/pollresults 123abc`                                                 |
| `/leaderboard [period]`                               | `/top`, `/lb` | View rankings (daily/weekly/alltime)             | `/leaderboard weekly`                                                 |
| `/report [reason]`                                    | -             | Report message to moderators (reply to msg)      | Reply to message: `/report Spam`                                      |

#### 📊 Enhanced Poll Features

Create polls with advanced features for better community engagement.

**Basic Poll Creation:**

```
/poll What's your favorite color? | Red | Blue | Green | Yellow
```

**Poll Flags:**

- `--multi` - Allow multiple choice voting (users can vote for more than one option)
- `--public` - Show voter names (default is anonymous)
- `--expires=TIME` - Auto-close poll after duration (e.g., `30m`, `1h`, `2h`, `1d`, `7d`)
- `--editable` - Allow editing the poll after creation

**Examples:**

```
# Multi-choice poll with 1-hour expiry
/poll --multi --expires=1h Which features do you want? | Feature A | Feature B | Feature C

# Public poll showing voter names
/poll --public Who should be MVP? | Alice | Bob | Charlie

# Editable poll that can be modified later
/poll --editable --expires=2d What should we discuss? | Topic 1 | Topic 2 | Topic 3
```

**Editing Polls:**

```
# Edit poll question
/editpoll 123abc question What's your favorite fruit?

# Edit poll option
/editpoll 123abc option1 Apples
/editpoll 123abc option2 Bananas
```

**Features:**

- **Single-choice** (default) or **multi-choice** voting
- **Anonymous** (default) or **public** voting with voter names
- **Automatic expiration** with configurable durations (minutes, hours, days)
- **Poll editing** for editable polls (question and options)
- **Real-time results** with progress bars and vote counts
- **Detailed results** view with `/pollresults` command
- Polls expire automatically and close with final results
- Creator is notified when poll expires

**How It Works:**

- Create a poll with your preferred flags
- Users vote by tapping options (tap again to remove vote)
- For multi-choice polls, users can select multiple options
- Poll results update in real-time for all users
- Polls with expiry close automatically at the specified time
- Use `/pollresults` to view detailed results including voter names (for public polls)

#### ⚡ User Preferences

Customize your personal lobby experience with individual preferences.

| Command                             | Aliases               | Description                                  | Example                             |
| ----------------------------------- | --------------------- | -------------------------------------------- | ----------------------------------- |
| `/preferences`                      | `/prefs`, `/settings` | View all your current preferences            | `/preferences`                      |
| `/preferences set <option> <value>` | -                     | Update a specific preference                 | `/preferences set compactMode true` |
| `/compact`                          | -                     | Quick toggle for compact mode                | `/compact`                          |
| `/quiet`                            | -                     | Quick toggle for hiding status announcements | `/quiet`                            |

**Available Preferences:**

- **Compact Mode** (`compactMode`): Reduce spacing in message display for a more condensed view
  - Values: `true` or `false` (default: `false`)
  - Example: `/preferences set compactMode true`
- **Hide Status Announcements** (`hideStatusAnnouncements`): Hide when users come online, go idle, or go offline
  - Values: `true` or `false` (default: `false`)
  - Example: `/preferences set hideStatusAnnouncements true`
- **Hide Join/Leave Announcements** (`hideJoinLeaveAnnouncements`): Hide when users join or leave the lobby
  - Values: `true` or `false` (default: `false`)
  - Example: `/preferences set hideJoinLeaveAnnouncements true`
- **Notification Preference** (`notificationPreference`): Control notification behavior (future feature)
  - Values: `all`, `mentions_only`, or `none` (default: `all`)
  - Example: `/preferences set notificationPreference mentions_only`
- **Auto-Mark Read** (`autoMarkRead`): Automatically mark messages as read (future feature)
  - Values: `true` or `false` (default: `true`)
  - Example: `/preferences set autoMarkRead false`

**Features:**

- All preferences are private and personal to you
- Changes take effect immediately
- Preferences persist across sessions
- Quick toggle commands for common preferences

#### 💬 Native Message Reactions

React to lobby messages using Telegram's built-in reaction system. All reactions are automatically synchronized across all lobby members.

**How to React:**

- **Long-press** (mobile) or **right-click** (desktop) on any lobby message
- Select any emoji reaction from Telegram's reaction picker
- Your reaction appears instantly on the message
- All lobby members see your reaction on their copy of the message

**Features:**

- **Native Telegram UI**: Use the familiar, built-in reaction interface
- **Full Emoji Support**: Access Telegram's complete reaction set (not limited to specific emojis)
- **Automatic Sync**: Reactions relay across all lobby members instantly
- **Add/Remove**: Tap a reaction again to remove it
- **Multiple Reactions**: React with as many different emojis as you want
- **Real-time Updates**: All users see reactions update in real-time

**How It Works:**

- When you react to a relayed message, the bot detects your reaction
- The bot automatically propagates your reaction to all other copies
- Every lobby member sees the same reactions on their copy
- Removing a reaction also syncs across all users

**Notes:**

- Only lobby members can react to relayed messages
- Banned or muted users cannot add reactions
- Reactions work on all message types (text, photos, videos, albums, etc.)
- Uses Telegram's native message_reaction system for reliability

#### 🗑️ Account Management

| Command     | Aliases | Description                             | Example     |
| ----------- | ------- | --------------------------------------- | ----------- |
| `/deleteme` | -       | Permanently delete account and all data | `/deleteme` |

#### ℹ️ Help & Information

| Command                  | Aliases | Description                        | Example                             |
| ------------------------ | ------- | ---------------------------------- | ----------------------------------- |
| `/help [topic\|command]` | `/h`    | Show help (user/mod/admin/command) | `/help`, `/help admin`, `/help ban` |

---

### Moderator Commands

Available to users with **mod** or **admin** role.

| Command                               | Aliases                  | Description                                                       | Example                                   |
| ------------------------------------- | ------------------------ | ----------------------------------------------------------------- | ----------------------------------------- |
| `/whois <alias\|reply>`               | `/w`, `/userinfo`, `/ui` | View detailed user information                                    | `/whois Alice` or reply with `/whois`     |
| `/warn <alias\|reply> [reason]`       | -                        | Issue warning (3 warnings = auto-ban)                             | `/warn Alice Spamming`                    |
| `/clearwarns <alias\|reply>`          | -                        | Clear all warnings for user                                       | `/clearwarns Alice`                       |
| `/cooldown <alias\|reply> <duration>` | `/cd`                    | Temporary mute (e.g., 30m, 2h, 1d)                                | `/cooldown Alice 1h`                      |
| `/reports`                            | -                        | List all pending reports                                          | `/reports`                                |
| `/viewreport <id>`                    | -                        | View detailed report information                                  | `/viewreport 123`                         |
| `/resolve <id> <action> [notes]`      | -                        | Resolve report (none/warned/muted/banned/kicked/media_restricted) | `/resolve 123 warned Spam warning issued` |
| `/whitelist <alias\|reply>`           | `/wl`                    | Add/remove from whitelist (exempt from compliance)                | `/whitelist Alice`                        |

---

### Admin Commands

Available to users with **admin** role only.

#### 🔨 Bulk Moderation

**Supports multiple users** - separate aliases with spaces. Interactive confirmation for 2+ users.

| Command                      | Aliases | Description                        | Example                   |
| ---------------------------- | ------- | ---------------------------------- | ------------------------- |
| `/ban <aliases> [duration]`  | `/b`    | Ban users (permanent or temporary) | `/ban Alice Bob 7d`       |
| `/unban <aliases>`           | `/ub`   | Unban users                        | `/unban Alice Bob`        |
| `/mute <aliases> [duration]` | `/m`    | Mute users (temporary)             | `/mute Alice Bob 2h`      |
| `/unmute <aliases>`          | `/um`   | Unmute users                       | `/unmute Alice Bob`       |
| `/kick <aliases>`            | `/k`    | Kick users from lobby              | `/kick Alice Bob Charlie` |

**Duration formats**: `30m` (30 minutes), `2h` (2 hours), `7d` (7 days), `1w` (1 week)

#### 🛡️ User Management

| Command                           | Aliases | Description                         | Example                  |
| --------------------------------- | ------- | ----------------------------------- | ------------------------ |
| `/restrictmedia <alias\|reply>`   | `/rm`   | Restrict user to text-only messages | `/restrictmedia Alice`   |
| `/unrestrictmedia <alias\|reply>` | `/urm`  | Remove media restriction            | `/unrestrictmedia Alice` |
| `/promote <alias\|reply> <role>`  | -       | Promote to mod or admin             | `/promote Alice mod`     |
| `/demote <alias\|reply>`          | -       | Remove moderator/admin role         | `/demote Alice`          |

#### 📢 Announcements

| Command                     | Aliases | Description                               | Example                                 |
| --------------------------- | ------- | ----------------------------------------- | --------------------------------------- |
| `/announce_lobby <message>` | -       | Send announcement to all lobby members    | `/announce_lobby Maintenance in 1 hour` |
| `/announce_all <message>`   | -       | Send announcement to ALL registered users | `/announce_all New features released!`  |

#### 🐌 Slowmode

Rate limiting system - minimum delay between messages per user.

| Command                    | Description                             | Example                           |
| -------------------------- | --------------------------------------- | --------------------------------- |
| `/slowmode [seconds\|off]` | Set slowmode delay (1-3600s) or disable | `/slowmode 30` or `/slowmode off` |
| `/slowmode`                | Check current slowmode status           | `/slowmode`                       |

**Note**: Admins, mods, and whitelisted users are exempt from slowmode.

#### 🔧 Maintenance Mode

Temporarily disable the lobby for maintenance or updates. All lobby messages will be blocked with a custom message shown to users.

| Command                     | Description                                          | Example                                        |
| --------------------------- | ---------------------------------------------------- | ---------------------------------------------- |
| `/maintenance`              | Show current maintenance mode status                 | `/maintenance`                                 |
| `/maintenance on [message]` | Enable maintenance mode with optional custom message | `/maintenance on We'll be back in 30 minutes!` |
| `/maintenance off`          | Disable maintenance mode                             | `/maintenance off`                             |
| `/maintenance status`       | Check current status (alias for `/maintenance`)      | `/maintenance status`                          |

**Features:**

- Blocks all lobby messages during maintenance
- Customizable user-facing message
- Admins can still use commands and send messages
- Automatically logs to audit trail
- Default message: "🔧 The lobby is currently undergoing maintenance. Please check back later."

**Note**: Only admins can send lobby messages during maintenance mode. Admin commands continue to function normally.

#### 🚫 Content Filters

Block messages matching keywords or regex patterns.

| Command                         | Description                  | Example                                 |
| ------------------------------- | ---------------------------- | --------------------------------------- |
| `/filter add <pattern> [notes]` | Add keyword/regex filter     | `/filter add badword Offensive content` |
| `/filter list`                  | View all filters (paginated) | `/filter list`                          |
| `/filter remove <id>`           | Delete filter                | `/filter remove 5`                      |
| `/filter toggle <id>`           | Enable/disable filter        | `/filter toggle 5`                      |

#### 🛡️ Anti-Spam System

Automatic spam detection and prevention system with escalating temporary mutes.

**Detection Types:**

- **Flood Detection**: Repeated identical/similar messages (85% similarity threshold)
- **Link Spam**: Too many links in messages or suspicious URLs
- **Rapid-Fire**: Burst messaging (10+ messages per minute)

**Auto-Mute Escalation**: 5m → 15m → 1h → 24h → 7d (resets over time)

| Command                          | Description                       | Example                             |
| -------------------------------- | --------------------------------- | ----------------------------------- |
| `/antispam`                      | Show configuration and statistics | `/antispam`                         |
| `/antispam config`               | View all configuration options    | `/antispam config`                  |
| `/antispam set <option> <value>` | Update spam detection setting     | `/antispam set floodMaxIdentical 5` |
| `/antispam whitelist <alias>`    | Exempt user from spam checks      | `/antispam whitelist Alice`         |
| `/antispam unwhitelist <alias>`  | Remove spam check exemption       | `/antispam unwhitelist Alice`       |
| `/antispam reset <alias>`        | Reset user's violation count      | `/antispam reset Alice`             |
| `/antispam clear <alias>`        | Clear user's auto-mute            | `/antispam clear Alice`             |
| `/antispam top`                  | Show top 10 spammers              | `/antispam top`                     |

**Configuration Options:**

- `floodEnabled` - Enable/disable flood detection (default: true)
- `floodMaxIdentical` - Max identical messages allowed (default: 3)
- `linkSpamEnabled` - Enable/disable link spam detection (default: true)
- `linkSpamMaxLinks` - Max links per message (default: 3)
- `rapidFireEnabled` - Enable/disable rapid-fire detection (default: true)
- `rapidFireMaxMessages` - Max messages per minute (default: 10)
- `autoMuteEnabled` - Enable/disable auto-mute (default: true)

**Note**: Admins, mods, and whitelisted users are exempt from spam checks.

#### 🎫 Invite System

Control lobby access with invite codes.

| Command                               | Description                  | Example                         |
| ------------------------------------- | ---------------------------- | ------------------------------- |
| `/invite_on`                          | Enable invite-only mode      | `/invite_on`                    |
| `/invite_off`                         | Disable invite-only mode     | `/invite_off`                   |
| `/invite_new <uses> <expiry> [notes]` | Create invite code           | `/invite_new 10 7d New members` |
| `/invite_list`                        | List all invites (paginated) | `/invite_list`                  |
| `/invite_revoke <code>`               | Deactivate invite code       | `/invite_revoke ABC123`         |
| `/invite_activate <code>`             | Reactivate invite code       | `/invite_activate ABC123`       |
| `/invite_delete <code>`               | Permanently delete invite    | `/invite_delete ABC123`         |

**Expiry formats**: `7d` (7 days), `24h` (24 hours), `2025-12-31` (specific date)

#### 📜 Rules Management

| Command                     | Description                 | Example                       |
| --------------------------- | --------------------------- | ----------------------------- |
| `/rules_add <emoji> <text>` | Add rule to lobby rules     | `/rules_add 1️⃣ Be respectful` |
| `/rules_remove <number>`    | Remove rule by number       | `/rules_remove 2`             |
| `/rules_clear`              | Clear all rules             | `/rules_clear`                |
| `/rules_list`               | List all rules (admin view) | `/rules_list`                 |

#### 📌 Native Pinned Messages

Pin important messages or announcements that appear at the top of every lobby member's chat using Telegram's native pin system.

| Command                   | Description                                   | Example                         |
| ------------------------- | --------------------------------------------- | ------------------------------- |
| `/pin` (reply to message) | Pin that specific lobby message in all chats  | Reply to a message: `/pin`      |
| `/pin <text>`             | Create and pin an announcement to all members | `/pin 📢 Welcome to the lobby!` |
| `/unpin <id>`             | Unpin message from all chats                  | `/unpin 3`                      |
| `/pinned`                 | View all pinned messages (public)             | `/pinned`                       |

**Features:**

- **Two Pin Modes**:
  - **Reply-to-pin**: Pin any existing lobby message
  - **Announcement**: Create new pinned announcement
- **Native Telegram Pins**: Messages actually appear at top of users' chats
- **Maximum 5 Pins**: Up to 5 pinned messages at a time
- **Auto-sync**: Pins/unpins across all lobby members simultaneously
- **Persistent Tracking**: Database records for audit and management
- **Individual Control**: Users can unpin in their own chat without affecting others

**How It Works:**

- **Reply Mode**: Admin replies to any lobby message with `/pin` → that message gets pinned in everyone's chat
- **Announcement Mode**: Admin uses `/pin <text>` → new message sent and pinned to all lobby members
- Unpinning removes pins from all users' chats at once
- Each pin has a unique ID for easy management

**Benefits:**

- Pins are always visible at top of chat (native Telegram behavior)
- More intuitive than command-based viewing
- Works exactly like regular Telegram pins

**Note**: Only admins can create and remove pinned messages. All users can view pins natively or with `/pinned`.

#### 🔧 Debug & Maintenance

| Command       | Description                                | Example       |
| ------------- | ------------------------------------------ | ------------- |
| `/debugmedia` | View media tracking debug info             | `/debugmedia` |
| `/debuglist`  | List debug information                     | `/debuglist`  |
| `/debugcopy`  | Copy debug data                            | `/debugcopy`  |
| `/nuke`       | Mass-delete operations (with confirmation) | `/nuke`       |
| `/purge`      | Purge operations (with confirmation)       | `/purge`      |

---

## 🔧 How It Works

### Anonymous Message Relay

When a user sends a message to the bot:

1. **Message Processing**

   - Bot receives message from user
   - Checks if user is banned/muted
   - Validates user is in lobby
   - Checks maintenance mode (admins exempt)
   - Checks slowmode restrictions
   - Checks content filters

2. **Relay Distribution**

   - Message is formatted with sender's icon and alias
   - Sent to ALL lobby members (except sender)
   - 200ms delay between recipients to avoid rate limits
   - Handles rate limits with automatic retry

3. **Message Threading**
   - When User A replies to User B's relayed message:
     - For User B: Reply targets their original message
     - For others: Reply targets their copy of User B's message
   - Uses QuoteLink (2-min TTL cache) + RelayedMessage (persistent DB)

### Privacy & Anonymity

- **No Identity Leaks**: Original sender never exposed in relayed messages
- **Private Blocking**: Block users without them knowing
- **Custom Aliases**: Choose any name (2-32 characters)
- **Custom Emojis**: Use any emoji as avatar (custom emojis require Telegram Premium)

### Activity Tracking

Users have three status states:

- **🟢 Online**: Currently active
- **🟡 Idle**: No activity for 15 minutes
- **⚫ Offline**: No activity for 60 minutes

### Media Support

Supports all Telegram message types:

- ✅ Text messages
- ✅ Photos
- ✅ Videos
- ✅ Audio files
- ✅ Documents
- ✅ Stickers
- ✅ Voice messages
- ✅ Animations (GIFs)
- ✅ Media groups/albums (buffered for 1.5 seconds)

### Editing & Deletion

- **Message Edits**: Automatically relayed to all copies across recipients
- **Message Deletion**: Not supported in polling mode (requires webhooks)

---

## ⚖️ Compliance & Auto-Moderation

### Automatic Compliance Checks

The bot runs compliance checks **daily at midnight** with the following rule:

#### Inactivity Rule

- **Requirement**: Must send at least 1 message every 7 days
- **Consequence**: Automatic kick from lobby
- **Exemptions**: Admins, mods, and whitelisted users

### Warning System

- Users receive warnings for compliance violations
- **3 warnings = permanent ban**
- Moderators can manually issue warnings for rule violations
- Admins/mods can clear warnings with `/clearwarns`

### Automatic Cleanup

Runs **daily at midnight**:

- Old reports (>90 days) deleted
- Closed polls (>30 days) deleted
- Relayed messages (24 hours retention, 7 days for warned/banned users)
- Expired confirmation prompts cleaned up

### Message Retention

- **Regular users**: 24 hours
- **Warned/banned users**: 7 days (for moderation review)
- **TTL-based**: Automatic deletion via MongoDB TTL indexes

---

## 📝 Audit Log System

All moderation and administrative actions are automatically logged to a persistent audit trail, providing accountability and transparency.

### What Gets Logged

The audit system records:

- **User Restrictions**: ban, unban, mute, unmute, kick, media restrictions
- **Role Management**: promote, demote, whitelist additions
- **Warning System**: warnings issued, warnings cleared, auto-bans
- **Content Management**: content filters (add, remove, toggle), slowmode configuration
- **Rules Management**: lobby rules (add, remove, clear)
- **Invite System**: invite mode toggles, invite creation/revocation/deletion
- **Reports**: report resolutions and dismissals
- **Temporary Actions**: cooldowns applied

### Audit Log Data

Each log entry includes:

- **Action Type**: What was done (e.g., "ban", "warn", "filter_add")
- **Moderator**: Who performed the action (with alias at time of action)
- **Target User**: Who was affected (with alias at time of action, if applicable)
- **Timestamp**: When the action occurred
- **Details**: Additional context (duration, reason, counts, etc.)
- **Metadata**: Flexible JSON object for action-specific information

### Viewing Audit Logs

**Commands** (available to admins and moderators):

| Command                  | Description                       | Example                |
| ------------------------ | --------------------------------- | ---------------------- |
| `/auditlog` or `/audit`  | View 20 most recent entries       | `/auditlog`            |
| `/auditlog [page]`       | Navigate to specific page         | `/auditlog 2`          |
| `/auditlog <action>`     | Filter by action type             | `/auditlog ban`        |
| `/auditlog user <alias>` | View all actions affecting a user | `/auditlog user Alice` |
| `/auditlog mod <alias>`  | View all actions by a moderator   | `/auditlog mod Bob`    |

**Available Action Filters:**

- User restrictions: `ban`, `unban`, `mute`, `unmute`, `kick`, `restrict_media`, `unrestrict_media`
- Role management: `promote`, `demote`, `whitelist_add`
- Warnings: `warn`, `clear_warnings`, `auto_ban`
- Temporary: `cooldown_apply`
- Content: `filter_add`, `filter_remove`, `filter_toggle`, `slowmode_enable`, `slowmode_disable`, `maintenance_enable`, `maintenance_disable`
- Rules: `rule_add`, `rule_remove`, `rule_clear`
- Invites: `invite_mode_enable`, `invite_mode_disable`, `invite_create`, `invite_revoke`, `invite_activate`, `invite_delete`
- Reports: `report_resolve`, `report_dismiss`

### Data Retention

- **Permanent storage**: Audit logs are retained indefinitely
- **No automatic cleanup**: Provides complete historical record
- **Indexed queries**: Fast lookups by moderator, target user, action type, or timestamp

### Use Cases

- **Accountability**: Track which moderator performed which action
- **Review history**: See all moderation actions against a specific user
- **Pattern detection**: Identify repeat offenders or overly aggressive moderation
- **Dispute resolution**: Provide evidence when users question moderation decisions
- **Compliance**: Maintain records for community guidelines enforcement
- **Training**: Review past actions to train new moderators

---

## 📈 Statistics Dashboard

Get comprehensive insights into lobby activity, user engagement, and moderation patterns with the built-in statistics system.

### Overview Statistics

View overall lobby metrics with `/stats`:

**User Metrics:**

- Total registered users
- Current lobby members
- Active users (online/idle)
- Lobby participation percentage

**Message Metrics:**

- Total messages (all time)
- Messages today/this week/this month
- Text vs media message ratio
- Message type breakdown

**Activity Insights:**

- Top 5 contributors by message count
- Recent activity levels
- Engagement trends

**Moderation Summary:**

- Most common moderation actions (last 30 days)
- Action frequency breakdown

### User-Specific Statistics

Analyze individual user activity with `/stats user <alias>`:

**Profile Information:**

- User status (online/idle/offline)
- Role and permissions
- Lobby membership status
- Join date and tenure

**Activity Metrics:**

- Total messages sent
- Text vs media breakdown
- Reply count
- Messages relayed to others
- Last activity timestamp

**Moderation History:**

- Warning count
- Times moderated
- Current restrictions (muted/banned/media-restricted)

### Time-Period Analysis

Compare activity across different timeframes:

| Command                                 | Description   | Timeframe |
| --------------------------------------- | ------------- | --------- |
| `/stats day` or `/stats period day`     | Last 24 hours | 1 day     |
| `/stats week` or `/stats period week`   | Last 7 days   | 1 week    |
| `/stats month` or `/stats period month` | Last 30 days  | 1 month   |

**Period Metrics:**

- Total messages in period
- New user registrations
- Moderation actions taken
- Top 5 contributors for the period

### Performance Optimizations

- **Caching**: Statistics are cached for 5 minutes to reduce database load
- **Parallel Queries**: Multiple stats calculated simultaneously for speed
- **Aggregation Pipelines**: Efficient MongoDB aggregations for complex queries
- **Indexed Lookups**: Fast queries on frequently accessed data

### Use Cases

**For Admins:**

- Monitor lobby growth and engagement trends
- Identify top contributors for recognition
- Track moderation workload
- Analyze peak activity times for scheduling

**For User Analysis:**

- Review individual user activity patterns
- Check user engagement levels
- Assess moderation history before decisions
- Verify user status and permissions

**For Community Health:**

- Compare activity across time periods
- Identify engagement drop-offs
- Track new member onboarding success
- Monitor content type preferences (text vs media)

### Commands Summary

```
/stats                          # Overall lobby statistics
/stats user <alias>             # User-specific statistics
/stats period <day|week|month>  # Time-period analysis
/stats day                      # Last 24 hours (shortcut)
/stats week                     # Last 7 days (shortcut)
/stats month                    # Last 30 days (shortcut)
```

---

## 📅 Scheduled Announcements

Automate announcements to be sent at specific times or on recurring schedules, ensuring important messages reach your community at the right moment.

### Overview

The scheduled announcements system allows admins to:

- **One-time announcements**: Send a message at a specific future date and time
- **Recurring announcements**: Send messages on a regular schedule (daily, weekly, hourly, etc.)
- **Flexible targeting**: Send to all users or just lobby members
- **Easy management**: Pause, resume, edit, and delete scheduled announcements

### Creating Announcements

#### One-Time Announcements

Send an announcement at a specific time:

```bash
/schedule create once <time> <message>
```

**Time Formats:**

- `14:30` - Today at 2:30 PM (or tomorrow if time has passed)
- `tomorrow 14:30` - Tomorrow at 2:30 PM
- `2025-11-05 14:30` - Specific date and time (YYYY-MM-DD HH:MM)
- `1h` - 1 hour from now
- `30m` - 30 minutes from now
- `2d` - 2 days from now

**Example:**

```bash
/schedule create once 1h Welcome to the lobby! Please read the rules with /rules
```

#### Recurring Announcements

Send announcements on a regular schedule:

```bash
/schedule create recurring <preset|pattern> <message>
```

**Available Presets:**

- `daily-9am` - Every day at 9:00 AM
- `daily-12pm` - Every day at 12:00 PM (noon)
- `daily-6pm` - Every day at 6:00 PM
- `daily-9pm` - Every day at 9:00 PM
- `weekly-monday` - Every Monday at 9:00 AM
- `weekly-friday` - Every Friday at 6:00 PM
- `hourly` - Every hour at minute 0
- `every-3h` - Every 3 hours
- `every-6h` - Every 6 hours

**Custom Cron Patterns:**

You can also use custom cron patterns (format: `minute hour day month weekday`):

- `0 9 * * *` - Every day at 9:00 AM
- `0 */3 * * *` - Every 3 hours
- `0 18 * * 5` - Every Friday at 6:00 PM
- `30 14 1 * *` - 2:30 PM on the 1st of every month

**Example:**

```bash
/schedule create recurring daily-9am ☀️ Good morning! Have a great day in the lobby!
```

### Options

Add these flags to customize your announcements:

- `--all` - Send to all registered users instead of just lobby members
- `--notes="text"` - Add private notes for your reference (not shown to users)

**Example with options:**

```bash
/schedule create recurring weekly-monday Daily reminder to be respectful! --all --notes="Weekly reminder"
```

### Managing Announcements

#### List All Scheduled Announcements

View all scheduled announcements with their status:

```bash
/schedule list
# or just
/schedule
```

Shows:

- Active announcements with countdown or schedule
- Paused announcements
- Announcement IDs for management
- Message preview

#### View Announcement Details

See complete details of a specific announcement:

```bash
/schedule view <id>
```

Shows:

- Full message text
- Schedule type and timing
- Target audience
- Created by whom and when
- Send history (count and last sent time)
- Notes (if any)

#### Pause/Resume Announcements

Temporarily disable an announcement without deleting it:

```bash
/schedule pause <id>    # Pause
/schedule resume <id>   # Resume
```

Useful for:

- Temporarily disabling seasonal announcements
- Pausing announcements during maintenance
- Keeping announcements for later reactivation

#### Delete Announcements

Permanently remove an announcement:

```bash
/schedule delete <id>
```

**Note:** This cannot be undone.

#### Test Announcements

Preview how an announcement will appear before it's sent:

```bash
/schedule test <id>
```

Sends a test copy to you (the admin) to verify formatting and content.

### How It Works

**One-Time Announcements:**

- Checked every minute for due announcements
- Automatically sent when scheduled time is reached
- Automatically disabled after sending
- Remains in list for reference (can be deleted)

**Recurring Announcements:**

- Set up as cron jobs on bot startup
- Run according to specified schedule
- Continue indefinitely until paused or deleted
- Re-scanned hourly to pick up newly created recurring announcements

**Delivery:**

- Announcements sent to all targeted users individually
- 100ms delay between recipients to avoid rate limits
- Failed deliveries logged but don't stop other sends
- Success/failure counts tracked in logs

### Audit Trail

All scheduled announcement operations are logged to the audit system:

- `schedule_create_once` - One-time announcement created
- `schedule_create_recurring` - Recurring announcement created
- `schedule_pause` - Announcement paused
- `schedule_resume` - Announcement resumed
- `schedule_delete` - Announcement deleted
- `schedule_send` - Announcement sent to users

View logs with `/auditlog schedule_create` or `/auditlog`.

### Use Cases

**Community Management:**

- Daily greeting messages to welcome lobby members
- Weekly reminders about rules and etiquette
- Scheduled event announcements
- Regular activity prompts to encourage engagement

**Administrative:**

- Maintenance notifications
- Feature announcements
- Policy updates
- Seasonal messages (holidays, special events)

**Moderation:**

- Periodic rule reminders
- Community guideline refreshers
- Reporting instructions
- Behavior expectation reminders

### Commands Summary

```bash
/schedule                           # List all scheduled announcements
/schedule list                      # Same as above
/schedule create once <time> <msg>  # Create one-time announcement
/schedule create recurring <pat> <msg>  # Create recurring announcement
/schedule view <id>                 # View announcement details
/schedule pause <id>                # Pause announcement
/schedule resume <id>               # Resume announcement
/schedule delete <id>               # Delete announcement
/schedule test <id>                 # Send test to yourself
/schedule help                      # Show command help
```

**Aliases:** `/schedules`, `/scheduled`

### Best Practices

1. **Test First**: Use `/schedule test` to preview announcements before they go live
2. **Start Small**: Begin with one or two recurring announcements to gauge response
3. **Time Wisely**: Schedule announcements for peak activity times
4. **Be Concise**: Keep announcements short and actionable
5. **Use Notes**: Add notes to remember why you created each announcement
6. **Review Regularly**: Check `/schedule list` periodically to clean up old announcements
7. **Target Appropriately**: Use `--all` sparingly; prefer lobby-only for most announcements

### Technical Details

**Timezone:**

- Scheduled times use Europe/Berlin timezone by default
- Adjust the timezone in `src/index.js` if needed
- One-time announcements use absolute dates (timezone-aware)
- Recurring announcements follow cron schedule in configured timezone

**Performance:**

- One-time announcements checked every 60 seconds
- Recurring announcements use node-cron for efficient scheduling
- New recurring announcements picked up within 1 hour
- No significant performance impact on bot operation

**Persistence:**

- All announcements stored in MongoDB
- Survive bot restarts
- Recurring announcements re-initialized on startup
- Send history tracked for reference

---

## 👋 Welcome Message System

Automatically greet new members with a customizable welcome message when they join the lobby, helping them feel welcome and guiding them to important resources.

### Overview

The welcome message system allows admins to:

- **Enable/disable** automatic welcome messages for new members
- **Customize** the message content to suit your community
- **Update** the message without disabling/re-enabling
- **Provide guidance** to new users about commands, rules, and expectations

### Configuration

#### View Current Status

Check if welcome messages are enabled and see the current message:

```bash
/welcome
# or
/welcome status
```

#### Enable Welcome Messages

Turn on welcome messages with the default message:

```bash
/welcome on
```

**Default message:**

```
👋 Welcome to the lobby! Feel free to introduce yourself and chat with others. Use /help to see all available commands.
```

Enable with a custom message:

```bash
/welcome on Hi! Welcome to our community! Check out /rules and feel free to introduce yourself.
```

#### Update Welcome Message

Change the message without disabling/enabling:

```bash
/welcome set <message>
```

**Example:**

```bash
/welcome set 👋 Hello! Welcome to the lobby! Start chatting with /help to see all commands.
```

#### Disable Welcome Messages

Turn off automatic welcome messages:

```bash
/welcome off
```

### When Welcome Messages Are Sent

Welcome messages are automatically sent to users:

- **After successful `/join`** - When a user joins the lobby
- **After pinned messages** - If pinned messages exist, welcome message appears after them
- **One time per join** - Only sent when joining, not on every message

### Use Cases

**Onboarding:**

- Greet new members warmly
- Direct them to help resources (`/help`)
- Encourage participation

**Guidance:**

- Point to important commands (`/rules`, `/profile`)
- Explain lobby etiquette
- Set expectations for behavior

**Community Building:**

- Create a welcoming atmosphere
- Encourage introductions
- Share community values

### Best Practices

1. **Keep it concise** - New users may be overwhelmed by too much text
2. **Include key commands** - Mention `/help` and `/rules` for self-service guidance
3. **Be welcoming** - Use friendly, inclusive language
4. **Update regularly** - Adjust based on common new user questions
5. **Test changes** - Join with a test account to see how it looks

### Example Welcome Messages

**Simple and friendly:**

```
👋 Welcome! Use /help to see all commands and /rules for our guidelines. Enjoy chatting!
```

**Community-focused:**

```
🎉 Welcome to our lobby! We're excited to have you here. Introduce yourself and use /help if you need anything.
```

**Informative:**

```
👋 Hello! You've joined the lobby. Key commands: /help (all commands), /rules (guidelines), /profile (your stats). Have fun!
```

### Audit Trail

All welcome message operations are logged to the audit system:

- `welcome_enable` - Welcome messages enabled
- `welcome_disable` - Welcome messages disabled
- `welcome_update` - Welcome message updated

View logs with `/auditlog welcome_enable` or `/auditlog`.

### Commands Summary

```bash
/welcome              # Show current status
/welcome status       # Show current status
/welcome on [msg]     # Enable with optional custom message
/welcome off          # Disable welcome messages
/welcome set <msg>    # Update message
```

---

## 🔍 Message Search

Search through your own message history to find specific messages, topics, or conversations you've participated in. The search system is privacy-focused and secure.

### Overview

The message search feature allows users to:

- **Search your own messages** - Find messages you've sent in the lobby
- **Privacy-first** - You can only search your own messages, never others'
- **Fast results** - Quick search with highlighted matches
- **Rich previews** - See message context with type and timestamp

### Basic Usage

Search your messages with a simple command:

```bash
/search <query>
# or
/find <query>
```

**Examples:**

```bash
/search hello           # Find messages containing "hello"
/search project update  # Find messages with "project update"
/find meeting           # Alternative command alias
```

### How It Works

**Search Features:**

- **Case-insensitive** - Matches "Hello", "hello", "HELLO" equally
- **Partial matching** - Finds "meeting" in "meetings", "tomorrow's meeting", etc.
- **All message types** - Searches text messages and media captions
- **Result limit** - Shows up to 20 most recent matches
- **Privacy guarantee** - Only searches messages where you are the original sender

**What Gets Searched:**

- Text messages you sent
- Captions on photos, videos, documents you sent
- Media group captions (albums)
- All message types with text content

**What Doesn't Get Searched:**

- Messages from other users (privacy protection)
- Deleted messages (automatically cleaned up)
- Messages older than expiry (based on TTL settings)

### Search Results

Results are displayed with:

- **Message type** - Icon and type name (text, photo, video, etc.)
- **Timestamp** - How long ago the message was sent
- **Preview** - First 100 characters with search term highlighted
- **Match highlighting** - Search terms appear bold and underlined

**Result Format:**

```
🔍 Search Results
Found 5 messages matching "hello"

💬 text • 2 hours ago
**hello** everyone! How's it going?

📷 photo • 1 day ago
Check out this photo - **hello** from the mountains!

💬 text • 3 days ago
Just wanted to say **hello** and introduce myself
```

### Privacy & Security

**Your Privacy Is Protected:**

- ✅ You can **only** search messages you sent
- ✅ Other users **cannot** search your messages
- ✅ Search queries are **not** logged or stored
- ✅ Results are **private** to you only
- ✅ No notification sent to others when you search

**Technical Details:**

- Searches use `originalUserId` to filter by sender
- Query validation prevents injection attacks
- Results limited to prevent performance issues
- Database queries are indexed for speed

### Query Limitations

**Minimum Length:** 2 characters

```bash
/search hi    # ✅ Valid
/search h     # ❌ Too short
```

**Maximum Length:** 100 characters

```bash
/search this is a reasonable search query    # ✅ Valid
/search [extremely long query over 100 chars...] # ❌ Too long
```

**Special Characters:**

- Special regex characters are automatically escaped
- Safe to search for: `$ ^ * + ? . [ ] { } ( ) |`
- Searches treat these as literal characters

### Use Cases

**Find Past Conversations:**

- Search for specific topics you discussed
- Recall when you mentioned something
- Find messages related to projects or events

**Reference Information:**

- Look up facts or links you shared
- Find media you posted with certain captions
- Retrieve information from your own messages

**Personal History:**

- Review your participation in discussions
- Track topics you've contributed to
- See your most recent messages about a subject

### Commands Summary

```bash
/search <query>          # Search your messages
/find <query>            # Same as /search (alias)
```

**Examples:**

```bash
/search hello world      # Find "hello world"
/search "meeting notes"  # Quotes optional, same result
/find project            # Using alias command
```

### Best Practices

1. **Be specific** - More specific queries return better results
2. **Use key terms** - Search for distinctive words rather than common ones
3. **Check spelling** - Searches are exact matches (case-insensitive)
4. **Try variations** - If no results, try different terms
5. **Use context** - Remember approximate time or topic to narrow mentally

### Troubleshooting

**No results found:**

- Check spelling of search terms
- Try broader search terms (single keyword vs. full phrase)
- Remember: only YOUR messages are searched
- Messages may have expired if older than TTL period

**Too many results:**

- Use more specific search terms
- Add additional keywords to narrow results
- Results limited to 20 most recent matches

**Search not working:**

- Ensure you're in the lobby (`/join` first)
- Check query length (2-100 characters)
- Try simpler search terms without special formatting

---

## 📦 Backup/Export System

Export bot data for backup purposes or GDPR compliance. Administrators can export user data, message history, and complete backups in JSON format.

### Overview

The backup/export system provides:

- **Data Portability** - Export all bot data for backups or migration
- **GDPR Compliance** - Export individual user data on request
- **JSON Format** - Standard, easy-to-parse export format
- **Admin-Only Access** - Secure, restricted to administrators
- **Privacy Protection** - User exports only include their own data

### Export Types

#### 1. User Data Export

Export all user information including profiles, activity, and preferences:

```bash
/export users
```

**Includes:**

- User profiles (alias, icon, role, registration date)
- Activity metrics (messages, status, engagement)
- Preferences settings (compact mode, notifications)
- Blocked users count (for privacy, not actual IDs)
- Spam violations and moderation history
- Current restrictions (mutes, bans, warnings)

**Use Cases:**

- User database backups
- Migration to new bot instance
- Analysis of user demographics
- Compliance documentation

#### 2. Message History Export

Export message history with optional time filtering:

```bash
/export messages           # Export all messages
/export messages 7         # Export last 7 days
/export messages 30        # Export last 30 days
```

**Includes:**

- Original message metadata (sender, timestamp, type)
- Message captions and text content
- Album IDs for media groups
- Recipient count per message
- Message type (text, photo, video, etc.)

**Privacy Note:** File IDs and actual media files are not included in exports for storage reasons. Only metadata and text/captions are exported.

**Use Cases:**

- Chat history backups
- Content analysis
- Archive old messages
- Debug message relay issues

#### 3. Full Backup Export

Export everything for complete system backup:

```bash
/export full              # Export all data
/export full 30           # Export all data with last 30 days of messages
```

**Includes:**

- **Users** - All user data (same as `/export users`)
- **Messages** - Message history (filtered by days if specified)
- **Reports** - All user reports and resolutions
- **Polls** - Poll questions, options, and vote counts
- **Audit Logs** - Last 1000 moderation actions
- **Pinned Messages** - Current pinned announcements
- **Reactions** - Reaction counts per message
- **Scheduled Announcements** - All scheduled messages
- **Global Settings** - Bot configuration (invite mode, slowmode, maintenance, etc.)

**Statistics Included:**

- Total reports
- Total polls
- Total audit log entries
- Total pinned messages
- Total reactions
- Total scheduled announcements

**Use Cases:**

- Complete system backup before updates
- Bot migration to new server
- Disaster recovery
- Historical archival

#### 4. GDPR User Export

Export specific user's complete data for GDPR compliance:

```bash
/export user <alias>
```

**Example:**

```bash
/export user alice        # Export Alice's complete data
```

**Includes:**

- **Personal Data** - Profile, alias, icon, registration info
- **Activity** - All activity metrics and message counts
- **Preferences** - All user preference settings
- **Blocked Users** - List of users they've blocked (actual IDs included for this user)
- **Spam Violations** - Violation history and auto-mute status
- **Messages Sent** - Complete list of messages they sent (type, timestamp, caption)
- **Reports** - Reports they made and reports against them
- **Polls** - Polls they created with vote counts
- **Moderation History** - All moderation actions involving them (as moderator or target)

**Privacy & GDPR:**

- Exports only the specified user's data
- Does not include other users' personal information
- Complies with GDPR "Right to Data Portability"
- Suitable for user data requests
- Can be provided directly to the user

**Use Cases:**

- GDPR data subject access requests
- User account deletion (export before deletion)
- User-requested data export
- Compliance with data protection laws

### Export Format

All exports are delivered as JSON files with the following structure:

```json
{
  "exportType": "users|messages|full|user_gdpr",
  "exportDate": "2025-11-03T12:00:00.000Z",
  "timeRange": "last 30 days" or "all time",
  "data": { ... }
}
```

**File Delivery:**

- Exports are sent as document attachments
- Filename includes export type and timestamp
- File size displayed in the caption
- Generation time shown

**Example Filenames:**

- `users_export_1730635200000.json`
- `messages_export_30d_1730635200000.json`
- `full_backup_1730635200000.json`
- `user_alice_1730635200000.json`

### Command Reference

```bash
/export                   # Show help
/export help              # Show detailed help
/export users             # Export all user data
/export messages          # Export all messages
/export messages <days>   # Export last N days of messages
/export full              # Export everything
/export full <days>       # Export everything with filtered messages
/export user <alias>      # Export specific user's data (GDPR)
```

**Alias:**

```bash
/backup                   # Same as /export
```

### Performance & Limitations

**Generation Time:**

- User export: ~1-2 seconds
- Message export: ~2-5 seconds (depends on history size)
- Full backup: ~5-15 seconds (comprehensive)
- GDPR user export: ~2-3 seconds

**File Sizes:**

- User exports: typically 50-500 KB
- Message exports: varies widely (1-50 MB depending on history)
- Full backups: largest, can be 10-100 MB+
- GDPR user exports: typically 10-100 KB per user

**Rate Limits:**

- No rate limit on export commands
- Large exports may take time to generate
- Telegram file size limit: 50 MB (automatic for most exports)

### Security & Privacy

**Access Control:**

- ✅ Admin-only command
- ✅ Requires `role: 'admin'` in database
- ✅ All export operations logged to audit trail
- ❌ Moderators and regular users cannot export

**Audit Trail:**
All export operations are logged with:

- Export type (users, messages, full, user_gdpr)
- Timestamp of export
- Admin who performed the export
- Export parameters (days, target user)
- Export statistics (counts)

**Action Types:**

- `export_users` - User data export
- `export_messages` - Message history export
- `export_full` - Full backup export
- `export_user` - GDPR user export

**Privacy Considerations:**

- User blocks: Only count included in general exports, full IDs only in GDPR export
- Spam violations: Included in full context
- Message content: Captions only, no actual media files
- Reactions: Anonymous counts only, no user attribution
- Reports: Reporter IDs included (for accountability)

### Use Cases

**For Administrators:**

- Regular backups before major updates
- Data migration to new infrastructure
- Compliance with data requests
- Historical archival for records
- Debugging and analysis

**For GDPR Compliance:**

- Respond to user data access requests
- Export before account deletion
- Provide user their complete data
- Demonstrate transparency

**For Disaster Recovery:**

- Full system backups
- Restore after data loss
- Migrate to new bot instance
- Test deployments with real data

### Best Practices

1. **Regular Backups** - Schedule regular full backups (weekly recommended)
2. **Version Control** - Keep dated backups for recovery points
3. **Secure Storage** - Store exports securely, they contain sensitive data
4. **Test Restores** - Periodically test backup restoration
5. **GDPR Timeline** - Respond to user data requests within 30 days
6. **Privacy** - Never share exports publicly, they contain user data
7. **Retention** - Follow data retention policies for backups

### Troubleshooting

**Export takes too long:**

- Large databases may take 10-30 seconds
- Use filtered exports (e.g., `/export messages 30` instead of all messages)
- Try during low-activity periods

**Export file too large:**

- Filter messages by days to reduce size
- Export users and messages separately instead of full backup
- Split exports by time period

**Export fails:**

- Check bot logs for error details
- Verify MongoDB connection is stable
- Ensure sufficient disk space
- Try again after a moment

---

## 🛠️ Development

### Project Structure

```
SecretLoungeBot/
├── src/
│   ├── index.js                 # Entry point
│   ├── setupCommands.js         # Command registration
│   ├── core/
│   │   ├── bot.js              # Telegraf instance
│   │   └── runtime.js          # Uptime tracking
│   ├── config/
│   │   └── constants.js        # Configuration constants
│   ├── db/
│   │   └── mongoose.js         # MongoDB connection
│   ├── models/                 # Mongoose schemas (15 models)
│   │   ├── User.js
│   │   ├── Activity.js
│   │   ├── RelayedMessage.js
│   │   ├── QuoteLink.js
│   │   ├── Block.js
│   │   ├── Report.js
│   │   ├── Poll.js
│   │   ├── Filter.js
│   │   ├── Setting.js
│   │   ├── Invite.js
│   │   ├── PinnedMessage.js
│   │   ├── Preferences.js
│   │   ├── AuditLog.js
│   │   ├── SpamDetection.js
│   │   └── Instance.js
│   ├── users/                  # User management
│   │   ├── index.js
│   │   ├── activity.js
│   │   └── compliance.js
│   ├── relay/                  # Message relay system
│   │   ├── index.js
│   │   ├── standardMessage.js
│   │   ├── mediaGroup.js
│   │   ├── editRelay.js
│   │   └── quoteMap.js
│   ├── handlers/               # Event handlers
│   │   └── relayHandler.js
│   ├── commands/               # Command handlers
│   │   ├── user/              # 18 user command files
│   │   ├── mod/               # 5 moderator command files
│   │   └── admin/             # 15 admin command files
│   ├── utils/                  # Shared utilities
│   │   ├── sanitize.js
│   │   ├── logger.js
│   │   ├── pagination.js
│   │   └── timeUtils.js
│   └── metrics/                # Anonymous metrics (optional)
│       ├── collect.js
│       └── sender.js
├── logs/                       # Generated log files
│   ├── combined.log
│   ├── error.log
│   ├── exceptions.log
│   └── rejections.log
├── .env.example               # Example environment file
├── package.json               # Dependencies & scripts
├── CHANGELOG.md              # Version history
└── README.md                 # This file
```

### Available Scripts

```bash
# Start the bot
npm start

# Import legacy data from JSON files
npm run import

# Run tests (not implemented yet)
npm test
```

### Tech Stack

- **Node.js**: ES Modules (modern JavaScript)
- **Telegraf 4.16.3**: Telegram Bot API framework
- **Mongoose 8.18.0**: MongoDB ODM
- **Winston 3.18.3**: Structured logging with rotation
- **dotenv**: Environment configuration
- **Crypto**: Secure random invite code generation

### Database Models

| Model            | Purpose                                          |
| ---------------- | ------------------------------------------------ |
| `User`           | User profiles, roles, restrictions               |
| `Activity`       | Activity tracking, status, statistics            |
| `RelayedMessage` | Message relay mapping for threading              |
| `QuoteLink`      | Temporary (2-min TTL) relay cache                |
| `Block`          | User blocking system                             |
| `Report`         | User reports to moderators                       |
| `Poll`           | Poll voting system                               |
| `Filter`         | Content filters (keywords/regex)                 |
| `Setting`        | Global settings (singleton)                      |
| `Invite`         | Invite codes                                     |
| `PinnedMessage`  | Native pinned messages (announcements & relayed) |
| `Preferences`    | User preferences (compact mode, notifications)   |
| `AuditLog`       | Moderation action audit trail                    |
| `SpamDetection`  | Anti-spam violation tracking                     |
| `Instance`       | Bot instance tracking for metrics                |

### Code Quality Features

- ✅ Comprehensive input validation
- ✅ HTML/MarkdownV2 escaping for security
- ✅ Batch queries to avoid N+1 patterns
- ✅ Database indexing for performance
- ✅ Graceful error handling
- ✅ Structured logging with Winston
- ✅ TTL-based automatic cleanup
- ✅ Rate limit handling with retry logic

---

## 🐛 Troubleshooting

### Bot won't start

**Error: "BOT_TOKEN is required"**

- Make sure your `.env` file exists and has `BOT_TOKEN=...`
- Verify the token is correct (from @BotFather)
- No quotes needed around the token

**Error: "MongoDB connection failed"**

- Check your `MONGO_URI` in `.env`
- For local MongoDB: Make sure MongoDB service is running
- For Atlas: Verify your IP is whitelisted
- Test connection string format

**Error: "Cannot find module..."**

- Run `npm install` to install dependencies
- Delete `node_modules` and `package-lock.json`, then run `npm install` again

### Messages not relaying

**Messages don't appear for other users:**

- Make sure users have joined with `/join`
- Check if sender is muted or banned (`/whois <alias>`)
- Verify maintenance mode isn't enabled (`/maintenance`)
- Verify slowmode isn't blocking messages (`/slowmode`)
- Check content filters (`/filter list`)

**Reply threading not working:**

- Reply threading only works for messages sent through the bot
- Messages older than 24 hours may not have stored references

### Users can't join

**"Invite code required":**

- Check if invite-only mode is enabled (`/invite_on`)
- Generate an invite code: `/invite_new 10 7d`
- Disable invite-only: `/invite_off`

**"Alias already taken":**

- User needs to choose a different alias
- Check existing aliases with `/whois`

### Performance issues

**Bot is slow or timing out:**

- Check MongoDB connection latency
- For cloud MongoDB: Consider upgrading tier
- Check server resources (CPU/RAM)
- Review logs in `logs/combined.log`

**Rate limit errors:**

- Bot automatically handles Telegram rate limits
- Consider increasing delays in relay system
- Reduce message frequency in high-traffic scenarios

### Common Issues

**Custom emoji not showing:**

- Custom emojis require Telegram Premium
- Non-premium users see the fallback emoji
- This is expected behavior

**Message edits not updating:**

- Edit relay requires polling mode
- Only lobby members' edits are relayed
- Banned/muted users' edits are ignored

**Chat history showing duplicates:**

- Message deduplication is automatic
- If duplicates appear, report as bug

### Getting Help

1. **Check logs**: `logs/error.log` and `logs/combined.log`
2. **Review CHANGELOG.md**: See if your issue is listed
3. **Open an issue**: Create a GitHub issue with:
   - Bot version (`/version`)
   - Error messages from logs
   - Steps to reproduce
   - Expected vs actual behavior

---

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

### Reporting Bugs

1. Check existing issues to avoid duplicates
2. Include bot version, error logs, and reproduction steps
3. Describe expected vs actual behavior

### Suggesting Features

1. Open an issue with `[Feature Request]` in title
2. Describe the feature and use case
3. Explain how it benefits the community

### Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Update `CHANGELOG.md` with your changes
5. Test thoroughly
6. Commit with clear messages
7. Push to your fork
8. Open a Pull Request

### Development Guidelines

- Follow existing code style (ES Modules)
- Add error handling for all async operations
- Update documentation for new features
- Test with multiple users
- Verify no memory leaks

---

## 📄 License

This project is licensed under the **ISC License**.

---

## 🙏 Credits

Built with:

- [Telegraf](https://telegraf.js.org/) - Telegram Bot API framework
- [Mongoose](https://mongoosejs.com/) - MongoDB ODM
- [Winston](https://github.com/winstonjs/winston) - Logging library

---

## 📊 Version History

See [CHANGELOG.md](CHANGELOG.md) for detailed version history and updates.

**Current Version**: 2.0.0 (November 3, 2025)

---

## 🔗 Links

- [Telegram Bot API Documentation](https://core.telegram.org/bots/api)
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- [Node.js Downloads](https://nodejs.org/)
- [Telegraf Documentation](https://telegraf.js.org/)

---

<div align="center">

**Made with ❤️ for anonymous communication**

_Star ⭐ this repository if you find it useful!_

</div>
