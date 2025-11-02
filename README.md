# 🎭 SecretLoungeBot (Telegram Lobby Bot)

> An anonymous Telegram chat lobby bot that enables users to communicate anonymously through customizable aliases and emoji avatars.

[![Version](https://img.shields.io/badge/version-1.9.0-blue.svg)](CHANGELOG.md)
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
🎨 **Customization** - Custom emojis (Premium users) with fallback support
📊 **Community Features** - Polls, leaderboards, user profiles, achievement badges
🛡️ **Advanced Moderation** - Reports, warnings, mute/ban system, content filters
🎫 **Invite System** - Optional invite-only mode with code generation
📜 **Chat History** - View recent lobby messages (last 50 from past 12 hours)
⚙️ **Auto-Moderation** - Compliance rules, activity tracking, slowmode

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

| Command | Aliases | Description | Example |
|---------|---------|-------------|---------|
| `/start` | - | Initialize bot and see welcome message | `/start` |
| `/alias <name>` | `/setalias`, `/rename` | Set your display name (2-32 chars) | `/alias Anonymous` |
| `/icon <emoji>` | - | Set your avatar emoji | `/icon 🎭` |
| `/profile [alias\|reply]` | - | View detailed user statistics | `/profile` or `/profile Alice` |
| `/tenure` | - | View lobby membership duration | `/tenure` |
| `/version` | `/v` | Display bot version and uptime | `/version` |

#### 🚪 Lobby Participation

| Command | Aliases | Description | Example |
|---------|---------|-------------|---------|
| `/join [code]` | `/j` | Join the lobby (with optional invite code) | `/join` or `/join ABC123` |
| `/leave` | `/l` | Leave the lobby | `/leave` |
| `/online` | `/o` | Show count of active users | `/online` |
| `/rules` | - | View lobby rules and guidelines | `/rules` |

#### 💬 Messaging & Communication

| Command | Aliases | Description | Example |
|---------|---------|-------------|---------|
| `/msg <alias> <message>` | `/dm` | Send private anonymous message | `/msg Alice Hello there!` |
| `/sign <message>` | `/s` | Sign message with your Telegram username | `/sign This is me!` |
| `/history` | - | View last 50 messages from past 12 hours | `/history` |

#### 🔒 Privacy & Blocking

| Command | Aliases | Description | Example |
|---------|---------|-------------|---------|
| `/block <alias\|reply>` | - | Block a user privately (no notification) | `/block Alice` or reply with `/block` |
| `/unblock <alias\|reply>` | - | Unblock a user | `/unblock Alice` |
| `/blocklist` | - | View all blocked users | `/blocklist` |

#### 🎪 Community Features

| Command | Aliases | Description | Example |
|---------|---------|-------------|---------|
| `/poll <question> \| <opt1> \| <opt2> \| ...` | - | Create poll (2-6 options) | `/poll Favorite color? \| Red \| Blue \| Green` |
| `/endpoll` | - | Close your most recent active poll | `/endpoll` |
| `/leaderboard [period]` | `/top`, `/lb` | View rankings (daily/weekly/alltime) | `/leaderboard weekly` |
| `/report [reason]` | - | Report message to moderators (reply to msg) | Reply to message: `/report Spam` |

#### 🗑️ Account Management

| Command | Aliases | Description | Example |
|---------|---------|-------------|---------|
| `/deleteme` | - | Permanently delete account and all data | `/deleteme` |

#### ℹ️ Help & Information

| Command | Aliases | Description | Example |
|---------|---------|-------------|---------|
| `/help [topic\|command]` | `/h` | Show help (user/mod/admin/command) | `/help`, `/help admin`, `/help ban` |

---

### Moderator Commands

Available to users with **mod** or **admin** role.

| Command | Aliases | Description | Example |
|---------|---------|-------------|---------|
| `/whois <alias\|reply>` | `/w`, `/userinfo`, `/ui` | View detailed user information | `/whois Alice` or reply with `/whois` |
| `/warn <alias\|reply> [reason]` | - | Issue warning (3 warnings = auto-ban) | `/warn Alice Spamming` |
| `/clearwarns <alias\|reply>` | - | Clear all warnings for user | `/clearwarns Alice` |
| `/cooldown <alias\|reply> <duration>` | `/cd` | Temporary mute (e.g., 30m, 2h, 1d) | `/cooldown Alice 1h` |
| `/reports` | - | List all pending reports | `/reports` |
| `/viewreport <id>` | - | View detailed report information | `/viewreport 123` |
| `/resolve <id> <action> [notes]` | - | Resolve report (none/warned/muted/banned/kicked/media_restricted) | `/resolve 123 warned Spam warning issued` |
| `/whitelist <alias\|reply>` | `/wl` | Add/remove from whitelist (exempt from compliance) | `/whitelist Alice` |

---

### Admin Commands

Available to users with **admin** role only.

#### 🔨 Bulk Moderation

**Supports multiple users** - separate aliases with spaces. Interactive confirmation for 2+ users.

| Command | Aliases | Description | Example |
|---------|---------|-------------|---------|
| `/ban <aliases> [duration]` | `/b` | Ban users (permanent or temporary) | `/ban Alice Bob 7d` |
| `/unban <aliases>` | `/ub` | Unban users | `/unban Alice Bob` |
| `/mute <aliases> [duration]` | `/m` | Mute users (temporary) | `/mute Alice Bob 2h` |
| `/unmute <aliases>` | `/um` | Unmute users | `/unmute Alice Bob` |
| `/kick <aliases>` | `/k` | Kick users from lobby | `/kick Alice Bob Charlie` |

**Duration formats**: `30m` (30 minutes), `2h` (2 hours), `7d` (7 days), `1w` (1 week)

#### 🛡️ User Management

| Command | Aliases | Description | Example |
|---------|---------|-------------|---------|
| `/restrictmedia <alias\|reply>` | `/rm` | Restrict user to text-only messages | `/restrictmedia Alice` |
| `/unrestrictmedia <alias\|reply>` | `/urm` | Remove media restriction | `/unrestrictmedia Alice` |
| `/promote <alias\|reply> <role>` | - | Promote to mod or admin | `/promote Alice mod` |
| `/demote <alias\|reply>` | - | Remove moderator/admin role | `/demote Alice` |

#### 📢 Announcements

| Command | Aliases | Description | Example |
|---------|---------|-------------|---------|
| `/announce_lobby <message>` | - | Send announcement to all lobby members | `/announce_lobby Maintenance in 1 hour` |
| `/announce_all <message>` | - | Send announcement to ALL registered users | `/announce_all New features released!` |

#### 🐌 Slowmode

Rate limiting system - minimum delay between messages per user.

| Command | Description | Example |
|---------|-------------|---------|
| `/slowmode [seconds\|off]` | Set slowmode delay (1-3600s) or disable | `/slowmode 30` or `/slowmode off` |
| `/slowmode` | Check current slowmode status | `/slowmode` |

**Note**: Admins, mods, and whitelisted users are exempt from slowmode.

#### 🚫 Content Filters

Block messages matching keywords or regex patterns.

| Command | Description | Example |
|---------|-------------|---------|
| `/filter add <pattern> [notes]` | Add keyword/regex filter | `/filter add badword Offensive content` |
| `/filter list` | View all filters (paginated) | `/filter list` |
| `/filter remove <id>` | Delete filter | `/filter remove 5` |
| `/filter toggle <id>` | Enable/disable filter | `/filter toggle 5` |

#### 🎫 Invite System

Control lobby access with invite codes.

| Command | Description | Example |
|---------|-------------|---------|
| `/invite_on` | Enable invite-only mode | `/invite_on` |
| `/invite_off` | Disable invite-only mode | `/invite_off` |
| `/invite_new <uses> <expiry> [notes]` | Create invite code | `/invite_new 10 7d New members` |
| `/invite_list` | List all invites (paginated) | `/invite_list` |
| `/invite_revoke <code>` | Deactivate invite code | `/invite_revoke ABC123` |
| `/invite_activate <code>` | Reactivate invite code | `/invite_activate ABC123` |
| `/invite_delete <code>` | Permanently delete invite | `/invite_delete ABC123` |

**Expiry formats**: `7d` (7 days), `24h` (24 hours), `2025-12-31` (specific date)

#### 📜 Rules Management

| Command | Description | Example |
|---------|-------------|---------|
| `/rules_add <emoji> <text>` | Add rule to lobby rules | `/rules_add 1️⃣ Be respectful` |
| `/rules_remove <number>` | Remove rule by number | `/rules_remove 2` |
| `/rules_clear` | Clear all rules | `/rules_clear` |
| `/rules_list` | List all rules (admin view) | `/rules_list` |

#### 🔧 Debug & Maintenance

| Command | Description | Example |
|---------|-------------|---------|
| `/debugmedia` | View media tracking debug info | `/debugmedia` |
| `/debuglist` | List debug information | `/debuglist` |
| `/debugcopy` | Copy debug data | `/debugcopy` |
| `/nuke` | Mass-delete operations (with confirmation) | `/nuke` |
| `/purge` | Purge operations (with confirmation) | `/purge` |

---

## 🔧 How It Works

### Anonymous Message Relay

When a user sends a message to the bot:

1. **Message Processing**
   - Bot receives message from user
   - Checks if user is banned/muted
   - Validates user is in lobby
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
│   ├── models/                 # Mongoose schemas (11 models)
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

| Model | Purpose |
|-------|---------|
| `User` | User profiles, roles, restrictions |
| `Activity` | Activity tracking, status, statistics |
| `RelayedMessage` | Message relay mapping for threading |
| `QuoteLink` | Temporary (2-min TTL) relay cache |
| `Block` | User blocking system |
| `Report` | User reports to moderators |
| `Poll` | Poll voting system |
| `Filter` | Content filters (keywords/regex) |
| `Setting` | Global settings (singleton) |
| `Invite` | Invite codes |
| `Instance` | Bot instance tracking for metrics |

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

**Current Version**: 1.9.0 (November 2, 2025)

---

## 🔗 Links

- [Telegram Bot API Documentation](https://core.telegram.org/bots/api)
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- [Node.js Downloads](https://nodejs.org/)
- [Telegraf Documentation](https://telegraf.js.org/)

---

<div align="center">

**Made with ❤️ for anonymous communication**

*Star ⭐ this repository if you find it useful!*

</div>
