// User types
export interface User {
  id: string;
  alias: string;
  username?: string;
  icon: {
    customEmojiId?: string;
    fallback: string;
  };
  role: 'admin' | 'mod' | 'whitelist' | null;
  inLobby: boolean;
  joinDate: string;
  totalMessages: number;
  totalReplies: number;
  totalTextMessages: number;
  totalMediaMessages: number;
  warnings: number;
  isBanned: boolean;
  isMuted: boolean;
  bannedUntil?: string | null;
  mutedUntil?: string | null;
  mediaRestricted: boolean;
  status?: 'online' | 'idle' | 'offline';
}

// Auth types
export interface AuthData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

export interface AuthResponse {
  success: boolean;
  data: {
    user: {
      id: string;
      username?: string;
      role: string;
      permissions: string[];
    };
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}

// Stats types
export interface OverviewStats {
  users: {
    total: number;
    inLobby: number;
    online: number;
    newToday: number;
  };
  messages: {
    total: number;
    today: number;
    thisWeek: number;
    textCount: number;
    mediaCount: number;
  };
  moderation: {
    pendingReports: number;
    actionsToday: number;
    activeBans: number;
    activeMutes: number;
  };
  spam: {
    trackedUsers: number;
    autoMuted: number;
    totalViolations: number;
  };
}

// Report types
export interface Report {
  _id: string;
  reporterId: string;
  reportedUserId: string;
  reportedAlias: string;
  messageId: number;
  messagePreview: string;
  messageType: string;
  reason: string;
  status: 'pending' | 'resolved' | 'dismissed';
  createdAt: string;
  resolvedBy?: string;
  resolvedAt?: string;
  resolutionAction?: string;
  resolutionNotes?: string;
}

// Settings types
export interface Settings {
  inviteOnly: boolean;
  slowmode: {
    enabled: boolean;
    seconds: number;
  };
  maintenance: {
    enabled: boolean;
    message: string;
  };
  welcome: {
    enabled: boolean;
    message: string;
  };
  rules: Array<{
    emoji: string;
    text: string;
  }>;
  spam: {
    flood: {
      enabled: boolean;
      maxIdentical: number;
    };
    linkSpam: {
      enabled: boolean;
      maxLinks: number;
    };
    rapidFire: {
      enabled: boolean;
      maxMessages: number;
    };
  };
}

// Filter types
export interface Filter {
  _id: string;
  pattern: string;
  isRegex: boolean;
  createdBy: string;
  action: 'block' | 'notify';
  active: boolean;
  notes?: string;
  createdAt: string;
}

// Invite types
export interface Invite {
  code: string;
  maxUses: number;
  uses: number;
  expiresAt?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
  isRevoked: boolean;
}

// API Response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Pagination
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
