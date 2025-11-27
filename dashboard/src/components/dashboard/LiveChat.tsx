"use client";

import { useEffect, useState, useRef } from "react";
import { apiClient } from "@/lib/api";
import { useSocket } from "@/contexts/SocketContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  userId: string;
  alias: string;
  icon: string | { customEmojiId: string; fallback: string };
  role?: string;
  karma: number;
  type: string;
  text: string;
  fileId?: string;
  albumId?: string;
  replyToAlias?: string | null;
  replyToText?: string | null;
  timestamp: string;
}

// Get role emoji (matching backend logic)
const getRoleEmoji = (role?: string): string => {
  if (!role) return "";

  const roleEmojis: Record<string, string> = {
    owner: "🔱",
    admin: "👑",
    mod: "🛡️",
    whitelist: "⭐",
  };

  return roleEmojis[role] || "";
};

// Get karma emoji (matching backend logic)
const getKarmaEmoji = (karma: number): string => {
  if (karma >= 100) return "🌟";
  if (karma >= 50) return "✨";
  if (karma >= 25) return "⭐";
  if (karma >= 10) return "🔆";
  if (karma >= 5) return "💫";
  if (karma <= -100) return "💀";
  if (karma <= -50) return "👿";
  if (karma <= -25) return "😈";
  if (karma <= -10) return "😠";
  if (karma <= -5) return "😒";
  return "";
};

// Render icon (handle both string emojis and custom emoji objects)
const renderIcon = (
  icon: string | { customEmojiId: string; fallback: string }
): string => {
  if (typeof icon === "string") {
    return icon;
  }
  // For custom emojis, use the fallback emoji
  return icon?.fallback || "👤";
};

export function LiveChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { subscribe, unsubscribe, connected } = useSocket();
  const [autoScroll, setAutoScroll] = useState(true);

  // Fetch message history on mount
  useEffect(() => {
    fetchHistory();
  }, []);

  // Subscribe to real-time messages
  useEffect(() => {
    const handleNewMessage = (data: unknown) => {
      const message = data as ChatMessage;
      setMessages((prev) => [...prev, message]);

      // Auto-scroll to bottom if enabled
      if (autoScroll) {
        setTimeout(() => {
          scrollRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
    };

    subscribe("chat:message", handleNewMessage);

    return () => {
      unsubscribe("chat:message", handleNewMessage);
    };
  }, [subscribe, unsubscribe, autoScroll]);

  // Auto-scroll to bottom when messages first load
  useEffect(() => {
    if (messages.length > 0 && autoScroll) {
      setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: "auto" });
      }, 100);
    }
  }, [messages.length > 0]); // Only on first load

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get<{
        messages: ChatMessage[];
        count: number;
      }>("/chat/history?limit=100&hours=24");

      if (response.success && response.data) {
        setMessages(response.data.messages);
      }
    } catch (err) {
      console.error("Failed to fetch chat history:", err);
      setError("Failed to load message history");
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!messageText.trim() || sending) return;

    try {
      setSending(true);
      setError(null);

      const payload: {
        text: string;
        replyToAlias?: string;
        replyToText?: string;
      } = {
        text: messageText.trim(),
      };

      // Include reply information if replying
      if (replyingTo) {
        payload.replyToAlias = replyingTo.alias;
        payload.replyToText = replyingTo.text?.substring(0, 100);
      }

      const response = await apiClient.post<{
        message: string;
        stats: { sent: number; failed: number; total: number };
      }>("/chat/send", payload);

      if (response.success) {
        setMessageText("");
        setReplyingTo(null); // Clear reply state
        // Message will appear via WebSocket broadcast
      } else {
        setError("Failed to send message");
      }
    } catch (err) {
      console.error("Failed to send message:", err);
      setError("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  // Format timestamp
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Check if message is media
  const isMediaMessage = (type: string) => {
    return [
      "photo",
      "video",
      "audio",
      "document",
      "voice",
      "animation",
      "sticker",
      "media_group",
    ].includes(type);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "h-2 w-2 rounded-full",
              connected ? "bg-green-500" : "bg-red-500"
            )}
          />
          <span className="text-sm font-medium">
            {connected ? "Connected" : "Disconnected"}
          </span>
        </div>
        <Badge variant="outline">{messages.length} messages</Badge>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-6 py-4">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-center text-muted-foreground">
              <p>
                No messages yet. Messages from the Telegram lobby will appear
                here.
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={`${msg.userId}-${msg.id}-${msg.timestamp}`}
                className="group flex gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex-shrink-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-lg">
                    {renderIcon(msg.icon)}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getKarmaEmoji(msg.karma) && (
                        <span className="text-sm">
                          {getKarmaEmoji(msg.karma)}
                        </span>
                      )}
                      <span className="font-semibold">{msg.alias}</span>
                      {msg.role &&
                        ["admin", "mod", "whitelist"].includes(msg.role) && (
                          <span className="text-sm">
                            {getRoleEmoji(msg.role)}
                          </span>
                        )}
                      <span className="text-xs text-muted-foreground">
                        {formatTime(msg.timestamp)}
                      </span>
                      {msg.type !== "text" && (
                        <Badge variant="secondary" className="text-xs">
                          {msg.type === "media_group" ? "Album" : msg.type}
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setReplyingTo(msg)}
                    >
                      Reply
                    </Button>
                  </div>
                  {msg.replyToAlias && msg.replyToText && (
                    <div className="mt-1 mb-2 rounded bg-muted/50 px-2 py-1.5 border-l-2 border-primary">
                      <p className="text-xs font-medium text-muted-foreground">
                        Replying to {msg.replyToAlias}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {msg.replyToText}
                      </p>
                    </div>
                  )}
                  <div className="mt-1 break-words">
                    {msg.text ? (
                      <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                    ) : isMediaMessage(msg.type) ? (
                      <p className="text-sm text-muted-foreground italic">
                        {msg.type === "media_group"
                          ? "[Media Album]"
                          : `[${msg.type}]`}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">
                        [No text]
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t p-4">
        {error && (
          <div className="mb-3 flex items-center gap-2 rounded-md bg-destructive/10 p-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}
        {replyingTo && (
          <div className="mb-2 flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 border-l-2 border-primary">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-muted-foreground">
                Replying to {replyingTo.alias}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {replyingTo.text || "[Media]"}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setReplyingTo(null)}
            >
              ✕
            </Button>
          </div>
        )}
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Type a message to send to the lobby..."
            disabled={sending || !connected}
            maxLength={4096}
            className="flex-1"
          />
          <Button
            type="submit"
            disabled={!messageText.trim() || sending || !connected}
            size="icon"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
        <p className="mt-2 text-xs text-muted-foreground">
          Messages sent here will appear in the Telegram lobby as coming from
          your admin account.
        </p>
      </div>
    </div>
  );
}
