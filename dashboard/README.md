# SecretLounge-Bot Dashboard

Modern Next.js 15 dashboard for managing the SecretLounge-Bot Telegram bot.

## Features

### Core Features
- **Telegram OAuth Authentication** - Secure login using Telegram Login Widget
- **Real-time Updates** - WebSocket integration for live statistics and notifications
- **Role-based Access Control** - Granular permissions system for different user roles
- **Responsive Design** - Mobile-friendly UI built with Tailwind CSS
- **Type-safe** - Full TypeScript support with strict mode enabled

### Dashboard Pages
- **Overview Dashboard** - Real-time statistics, active users, message counts
- **User Management** - View, search, filter, ban, mute, kick users with bulk actions
- **Permissions & Roles** - Manage custom roles and system roles with visual badges
- **Audit Logs** - Complete moderation history with filtering and search
- **Settings** - Bot configuration including invite system, compliance rules, and more
- **Notifications** - In-app notification center with preferences and real-time alerts

### Management Features
- **User Actions** - Ban, mute, kick, warn users with duration and reason
- **Bulk Operations** - Perform actions on multiple users simultaneously
- **Role Assignment** - Assign custom roles and system roles to users
- **Permission Management** - Create and edit custom roles with granular permissions
- **System Role Customization** - Edit role emojis, colors, and permissions
- **Content Moderation** - Review reports, manage content filters, configure slowmode

### Real-time Features
- **Live Statistics** - User counts, message metrics, activity tracking
- **WebSocket Events** - Instant notifications for reports, bans, user actions
- **System Health Monitoring** - Bot status, memory usage, uptime tracking
- **Notification System** - Real-time alerts with sound and desktop notification support
- **Auto-refresh** - Automatic data updates without page reload

### UI/UX Features
- **Dark Mode** - Full dark mode support throughout the interface
- **Emoji Picker** - Visual emoji selector for role customization
- **Data Tables** - Sortable, filterable tables with pagination
- **Tab Persistence** - Maintain active tab state across page reloads
- **Loading States** - Skeleton loaders and loading indicators
- **Toast Notifications** - Success/error feedback for all actions

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript (strict mode)
- **UI**: shadcn/ui components + Tailwind CSS
- **State Management**: React Query for server state
- **Real-time**: Socket.io-client
- **Charts**: Recharts
- **Icons**: Lucide Icons
- **Forms**: React Hook Form + Zod validation

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Dashboard API running (see `../dashboard-api/README.md`)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your values:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_WS_URL=ws://localhost:3001
NEXT_PUBLIC_BOT_USERNAME=YourBotUsername
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
dashboard/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── dashboard/          # Protected dashboard pages
│   │   │   ├── page.tsx                # Overview dashboard
│   │   │   ├── users/page.tsx          # User management
│   │   │   ├── permissions/page.tsx    # Roles & permissions
│   │   │   ├── audit/page.tsx          # Audit logs
│   │   │   ├── settings/page.tsx       # Bot settings
│   │   │   └── notifications/page.tsx  # Notification center
│   │   ├── login/              # Login page
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Home redirect page
│   │   └── globals.css         # Global styles
│   │
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── tabs.tsx
│   │   │   └── ... (30+ components)
│   │   ├── dashboard/          # Dashboard-specific components
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   └── NotificationCenter.tsx
│   │   ├── common/             # Reusable components
│   │   │   └── EmojiPicker.tsx
│   │   ├── users/              # User management components
│   │   │   └── AssignRolesDialog.tsx
│   │   └── permissions/        # Permission components
│   │       └── SystemRoleEditDialog.tsx
│   │
│   ├── contexts/               # React contexts
│   │   ├── AuthContext.tsx     # Authentication state
│   │   ├── SocketContext.tsx   # WebSocket connection
│   │   └── NotificationContext.tsx  # Notification management
│   │
│   ├── lib/                    # Utilities and clients
│   │   ├── api.ts              # Axios API client
│   │   ├── socket.ts           # Socket.io client
│   │   └── utils.ts            # Helper functions
│   │
│   └── types/                  # TypeScript type definitions
│       └── api.ts              # API response types
│
├── public/                     # Static assets
├── next.config.ts              # Next.js configuration
├── tailwind.config.ts          # Tailwind CSS configuration
├── tsconfig.json               # TypeScript configuration
└── package.json                # Dependencies and scripts
```

## Available Pages

### Implemented
- `/` - Home (redirects to dashboard or login)
- `/login` - Telegram OAuth authentication
- `/dashboard` - Overview dashboard with real-time statistics and charts
- `/dashboard/users` - User management with search, filter, and moderation actions
- `/dashboard/permissions` - Custom roles and system role management with permission matrix
- `/dashboard/audit` - Audit log with filtering, search, and export capabilities
- `/dashboard/settings` - Bot configuration (invite system, compliance, filters, etc.)
- `/dashboard/notifications` - Notification center with preferences and real-time alerts

### Future Enhancements
- `/dashboard/analytics` - Advanced analytics with charts and trends
- `/dashboard/reports` - User report management dashboard
- `/dashboard/exports` - Data export and backup management

## Authentication Flow

1. User clicks "Login with Telegram" button
2. Telegram Login Widget opens in popup
3. User authenticates with Telegram
4. Widget returns auth data (id, username, hash, etc.)
5. Dashboard sends auth data to API for verification
6. API verifies Telegram hash and checks permissions
7. API returns JWT access token and refresh token
8. Dashboard stores tokens in localStorage
9. Dashboard redirects to `/dashboard`

## Real-time Features

The dashboard uses WebSocket (Socket.io) for real-time updates:

### Event Types
- **Statistics Updates** (`stats:update`) - Dashboard stats refresh automatically
- **User Events** (`user:joined`, `user:left`) - Real-time notifications when users join/leave lobby
- **Reports** (`report:new`) - Instant notifications for new user reports
- **Moderation Actions** (`moderation:action`) - Live updates when moderators ban/mute/kick users
- **Spam Alerts** (`spam:alert`) - Immediate alerts for spam detection
- **Audit Logs** (`audit:log`) - Real-time audit log entries
- **Settings Changes** (`settings:change`) - Instant notification when bot settings are updated
- **Notifications** (`notification:new`) - In-app notification delivery
- **Bot Logs** (`bot:log`, `bot:error`) - Live bot logging and error streaming
- **System Health** (`system:health`) - Bot health metrics and status updates
- **Relay Failures** (`relay:failure`) - Message delivery failure notifications
- **User Blocked** (`user:blocked`) - Notification when users block the bot

### Connection Management
- Automatic reconnection on connection loss
- Keepalive pings to maintain connection
- Graceful degradation when WebSocket unavailable
- Connection status indicator in UI

## API Integration

The dashboard communicates with the backend API using Axios:

- **Base URL**: Configured via `NEXT_PUBLIC_API_URL`
- **Authentication**: JWT Bearer token in Authorization header
- **Auto-refresh**: Automatically refreshes expired access tokens
- **Error Handling**: Graceful error handling with user feedback

## Adding New Pages

1. Create page file in `src/app/dashboard/your-page/page.tsx`
2. Add route to sidebar in `src/components/dashboard/Sidebar.tsx`
3. Define permission requirement (if needed)
4. Create API endpoint calls in `src/lib/api.ts`
5. Define TypeScript types in `src/types/api.ts`

## Development Tips

- Use `npm run dev` for hot-reloading during development
- Use `npm run lint` to check for code issues
- Use `npm run type-check` to verify TypeScript types
- Check browser console for API errors and WebSocket events
- Use React DevTools for debugging component state

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:3001/api` |
| `NEXT_PUBLIC_WS_URL` | WebSocket URL | `ws://localhost:3001` |
| `NEXT_PUBLIC_BOT_USERNAME` | Telegram bot username | `YourBotUsername` |

## Troubleshooting

### Login not working
- Verify `NEXT_PUBLIC_BOT_USERNAME` is correct
- Check browser console for errors
- Ensure API is running and accessible
- Check Telegram bot settings

### WebSocket not connecting
- Verify `NEXT_PUBLIC_WS_URL` is correct
- Check if API server is running
- Look for CORS errors in browser console
- Check firewall settings

### Build errors
- Run `npm install` to ensure dependencies are up to date
- Clear `.next` directory: `rm -rf .next`
- Check for TypeScript errors: `npm run type-check`

## License

Same as main SecretLounge-Bot project
