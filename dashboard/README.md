# SecretLounge-Bot Dashboard

Modern Next.js 15 dashboard for managing the SecretLounge-Bot Telegram bot.

## Features

- **Telegram OAuth Authentication** - Secure login using Telegram Login Widget
- **Real-time Updates** - WebSocket integration for live statistics and notifications
- **Role-based Access Control** - Granular permissions system for different user roles
- **Responsive Design** - Mobile-friendly UI built with Tailwind CSS
- **Type-safe** - Full TypeScript support with strict mode enabled

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
│   │   ├── login/              # Login page
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Home redirect page
│   │   └── globals.css         # Global styles
│   │
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   └── card.tsx
│   │   └── dashboard/          # Dashboard-specific components
│   │       ├── Sidebar.tsx
│   │       └── Header.tsx
│   │
│   ├── contexts/               # React contexts
│   │   ├── AuthContext.tsx     # Authentication state
│   │   └── SocketContext.tsx   # WebSocket connection
│   │
│   ├── lib/                    # Utilities and clients
│   │   ├── api.ts              # Axios API client
│   │   ├── socket.ts           # Socket.io client
│   │   └── utils.ts            # Helper functions
│   │
│   ├── types/                  # TypeScript type definitions
│   │   └── api.ts              # API response types
│   │
│   └── hooks/                  # Custom React hooks (future)
│
├── public/                     # Static assets
├── next.config.ts              # Next.js configuration
├── tailwind.config.ts          # Tailwind CSS configuration
├── tsconfig.json               # TypeScript configuration
└── package.json                # Dependencies and scripts
```

## Available Pages

- `/` - Home (redirects to dashboard or login)
- `/login` - Telegram authentication
- `/dashboard` - Overview with real-time statistics
- `/dashboard/users` - User management (future)
- `/dashboard/moderation` - Moderation center (future)
- `/dashboard/content` - Content management (future)
- `/dashboard/analytics` - Analytics dashboard (future)
- `/dashboard/audit` - Audit log (future)
- `/dashboard/settings` - Bot settings (future)
- `/dashboard/permissions` - Permission management (future)

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

- **Statistics Updates**: Dashboard stats refresh every 5 seconds
- **User Events**: Real-time notifications when users join/leave
- **Reports**: Instant notifications for new reports
- **Moderation Actions**: Live updates when moderators take action
- **Spam Alerts**: Immediate alerts for spam detection

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
