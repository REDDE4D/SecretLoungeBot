'use client';

import { LiveChat } from '@/components/dashboard/LiveChat';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MessageCircle } from 'lucide-react';

export default function ChatPage() {
  return (
    <div className="h-full flex flex-col space-y-6 p-8">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <MessageCircle className="h-8 w-8" />
          Live Chat
        </h1>
        <p className="text-muted-foreground mt-2">
          View and send messages to the Telegram lobby in real-time
        </p>
      </div>

      <Card className="flex-1 flex flex-col min-h-0">
        <CardHeader>
          <CardTitle>Lobby Messages</CardTitle>
          <CardDescription>
            All messages sent in the lobby are displayed here. You can send messages that will appear in Telegram as coming from your admin account.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 p-0">
          <LiveChat />
        </CardContent>
      </Card>
    </div>
  );
}
