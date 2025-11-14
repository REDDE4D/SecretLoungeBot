# 🎭 SecretLoungeBot (Telegram Lobby Bot)

> An anonymous Telegram chat lobby bot that enables users to communicate anonymously through customizable aliases and emoji avatars.

[![Version](https://img.shields.io/badge/version-2.4.0-blue.svg)](CHANGELOG.md)
[![License](https://img.shields.io/badge/license-ISC-green.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node.js-%3E%3D16.0.0-brightgreen.svg)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/mongodb-required-47A248.svg)](https://www.mongodb.com/)

---

## 📋 Quick Links

- **[📚 Full Documentation](docs/)** - Complete documentation in `docs/` directory
  - [**Command Reference**](docs/COMMANDS.md) - All 50+ bot commands
  - [**Database Models**](docs/MODELS.md) - Schema reference for 20+ models
  - [**Systems Documentation**](docs/SYSTEMS.md) - In-depth feature documentation
  - [**Dashboard Guide**](docs/DASHBOARD.md) - Web dashboard setup and API
- **[📝 Changelog](CHANGELOG.md)** - Version history and updates
- **[🛠️ Development Guide](CLAUDE.md)** - For contributors and developers

---

## 🎯 Overview

**SecretLoungeBot** creates an anonymous chat lobby in Telegram where users can communicate without revealing their identity. Users register with custom aliases and emoji avatars, join a shared lobby, and send messages that are relayed to all other members while preserving complete anonymity.

### Key Features

✨ **Anonymous Communication** - Custom aliases and emoji icons
🔒 **Privacy Controls** - User blocking, GDPR-compliant data deletion
🎨 **Customization** - Custom emojis (Premium), user preferences, roles
📊 **Community** - Polls, leaderboards, profiles, reactions, achievements
🛡️ **Moderation** - Advanced anti-spam, reports, content filters, audit logs
🎫 **Invite System** - Optional invite-only mode with code generation
📜 **Chat History** - View last 50 messages from past 12 hours
📌 **Native Pins** - Pin announcements or messages to top of chat
💬 **Native Reactions** - Telegram's built-in reactions, synced across users
⚙️ **Auto-Moderation** - Compliance rules, slowmode, spam detection
📊 **Statistics** - Comprehensive stats, user profiles, analytics
🖥️ **Web Dashboard** - Full-featured admin dashboard with real-time updates

---

## 🚀 Quick Start

### Prerequisites

1. **Node.js** (v16.0.0 or higher) - [Download](https://nodejs.org/)
2. **MongoDB** database - [MongoDB Atlas (Free)](https://www.mongodb.com/cloud/atlas/register) or [Local Install](https://www.mongodb.com/try/download/community)
3. **Telegram Bot Token** - Get from [@BotFather](https://t.me/BotFather)
4. **Your Telegram User ID** - Get from [@userinfobot](https://t.me/userinfobot)

### Installation

```bash
# Clone repository
git clone <your-repository-url>
cd SecretLoungeBot

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your values (see Configuration section below)

# Start the bot
npm start
```

### Configuration

Edit `.env` with your values:

```env
# Required
BOT_TOKEN=your-bot-token-from-botfather
ADMIN_ID=your-telegram-user-id
MONGO_URI=mongodb://localhost:27017/
DBNAME=lobbyBot

# Optional
ERROR_NOTIFICATION_ID=separate-error-recipient
METRICS_ENABLED=true  # Anonymous metrics collection
```

**That's it!** Your bot is now running. Open Telegram and start a chat with your bot.

---

## 💬 Basic Usage

### For Users

1. `/start` - Start the bot
2. `/register YourAlias` - Create your anonymous identity
3. `/join` - Join the lobby (or `/join CODE` if invite-only)
4. Send any message - It will be relayed to all lobby members
5. `/help` - View all available commands

### For Admins

- `/ban <user>` - Ban users
- `/mute <user> <duration>` - Temporarily mute users
- `/filter add <keyword>` - Add content filters
- `/slowmode 10` - Set 10-second delay between messages
- `/stats` - View comprehensive lobby statistics

**See [Command Reference](docs/COMMANDS.md) for all 50+ commands**

---

## 📚 Documentation

All detailed documentation is in the `docs/` directory:

| Document | Description |
|----------|-------------|
| **[COMMANDS.md](docs/COMMANDS.md)** | Complete reference for all 50+ bot commands with examples |
| **[MODELS.md](docs/MODELS.md)** | Database schemas for all 20+ MongoDB models |
| **[SYSTEMS.md](docs/SYSTEMS.md)** | In-depth documentation for all bot systems and features |
| **[DASHBOARD.md](docs/DASHBOARD.md)** | Web dashboard architecture, API, and deployment guide |
| **[CHANGELOG.md](CHANGELOG.md)** | Version history and release notes |
| **[CLAUDE.md](CLAUDE.md)** | Development guide and architecture overview |

---

## 🖥️ Web Dashboard

SecretLounge includes a full-featured web dashboard for easy administration:

- **Real-time Statistics** - Live user counts, message metrics, activity tracking
- **User Management** - View, search, filter, ban, mute, kick users
- **Permissions & Roles** - Manage custom roles and system roles
- **Audit Logs** - Complete moderation history with filtering
- **Settings** - Configure bot settings, invite system, compliance rules
- **Notifications** - In-app notification center with real-time alerts

### Dashboard Quick Start

```bash
# Install dashboard dependencies
cd dashboard-api && npm install
cd ../dashboard && npm install

# Configure dashboard (see docs/DASHBOARD.md for details)
cp dashboard-api/.env.example dashboard-api/.env
# Edit dashboard-api/.env with your values

# Start dashboard API
cd dashboard-api && npm start

# Start dashboard frontend (in separate terminal)
cd dashboard && npm run dev
```

**See [Dashboard Documentation](docs/DASHBOARD.md) for complete setup guide**

---

## 🛠️ Development

### Project Structure

```
SecretLoungeBot/
├── src/
│   ├── commands/         # Bot commands (user, mod, admin)
│   ├── handlers/         # Message handlers
│   ├── models/           # MongoDB models
│   ├── relay/            # Message relay system
│   ├── services/         # Business logic services
│   ├── users/            # User management
│   └── utils/            # Utilities and helpers
├── dashboard/            # Next.js dashboard frontend
├── dashboard-api/        # Express API + WebSocket
├── docs/                 # Complete documentation
└── logs/                 # Winston log files

```

### Development Commands

```bash
# Start bot
npm start

# Import data from legacy JSON files
npm run import

# View logs
tail -f logs/combined.log
tail -f logs/error.log
```

### Tech Stack

- **Bot**: Node.js, Telegraf, MongoDB, Winston
- **Dashboard API**: Express.js, Socket.io, JWT
- **Dashboard UI**: Next.js 15, React 19, TypeScript, Tailwind CSS

---

## 🔧 Troubleshooting

### Bot won't start

- Verify `BOT_TOKEN` is correct
- Check MongoDB connection (test with `mongosh` or MongoDB Compass)
- Ensure all required environment variables are set
- Check logs in `logs/error.log`

### Users can't join

- Check if invite-only mode is enabled (`/invite_on` / `/invite_off`)
- Verify users have registered first (`/register`)
- Check if maintenance mode is active

### Messages not relaying

- Verify user is in lobby (`/status`)
- Check if user is muted or banned
- Check if user blocked the bot (HTTP 403 errors in logs)
- Verify MongoDB connection is stable

### Dashboard not loading

- Ensure dashboard-api is running on port 3001
- Verify `NEXT_PUBLIC_API_URL` in dashboard `.env.local`
- Check CORS settings in dashboard-api `.env`
- See [Dashboard Documentation](docs/DASHBOARD.md) for detailed troubleshooting

**For more help, check the [Systems Documentation](docs/SYSTEMS.md)**

---

## 📊 Features Overview

### Core Features
- Anonymous message relay with media support (photos, videos, documents, stickers, etc.)
- User registration and alias management
- Lobby join/leave system
- Reply threading across relayed messages
- Native Telegram reactions (synced across all users)
- Message editing (propagates to all copies)

### Communication
- Polls with anonymous voting
- Pinned messages (max 5)
- Direct mentions (`/s <user> <message>`)
- Chat history (last 50 messages, 12 hours)
- Message search for your own messages

### User Features
- User profiles with statistics
- Leaderboards (daily, weekly, all-time)
- Achievements and tenure milestones
- Personal blocking (private, no notification)
- Customizable preferences (compact mode, quiet mode, etc.)

### Moderation
- Ban, mute, kick, warn system
- Reports with moderator resolution
- Content filters (keyword and regex)
- Anti-spam system with escalating mutes
- Slowmode with role-based exemptions
- Compliance system (activity requirements)
- Comprehensive audit logs (41+ action types)

### Administration
- Custom role system with granular permissions
- Invite-only mode with invite codes
- Scheduled announcements (one-time and recurring)
- Welcome messages for new members
- Rules system
- Statistics dashboard
- Data export for GDPR compliance
- Bot restart command

### Dashboard
- Real-time WebSocket updates
- User management with bulk actions
- Permission matrix for role management
- Audit log viewer with filtering
- Settings management
- In-app notifications
- System health monitoring

**See [Systems Documentation](docs/SYSTEMS.md) for detailed feature documentation**

---

## 📖 Example Workflows

### Setting Up an Anonymous Lobby

1. Start the bot and register: `/register MyAlias`
2. (Optional) Enable invite-only mode: `/invite_on`
3. (Optional) Create invite codes: `/invite_new 10 uses, 7d expiry`
4. Configure compliance rules in dashboard or via commands
5. Set up content filters: `/filter add badword`
6. Configure anti-spam: `/antispam set enabled true`
7. Invite users and have them `/register` and `/join`

### Moderating Content

1. Users report problematic messages: Reply with `/report spam`
2. Moderators review: `/reports`
3. View report details: `/viewreport <id>`
4. Take action: `/mute <user> 1h` or `/ban <user> 7d`
5. Resolve report: `/resolve <id> Handled`
6. Check audit log: `/auditlog`

### Using the Dashboard

1. Generate dashboard login code: `/dashboard_login`
2. Open dashboard, click "Login with Telegram"
3. Scan QR code or enter code in Telegram
4. View real-time statistics and manage users
5. Create custom roles and assign permissions
6. Review audit logs and configure settings

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Update relevant documentation in `docs/`
5. Update `CHANGELOG.md` following [Semantic Versioning](https://semver.org/)
6. Submit a pull request

**See [CLAUDE.md](CLAUDE.md) for development guidelines**

---

## 📄 License

ISC License - See LICENSE file for details

---

## 🆘 Support

- **Documentation**: Check the `docs/` directory first
- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Changelog**: [CHANGELOG.md](CHANGELOG.md) for recent changes

---

**Made with ❤️ for anonymous communities**
