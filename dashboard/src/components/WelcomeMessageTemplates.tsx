'use client';

import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface WelcomeMessageTemplatesProps {
  onSelect: (template: Template) => void;
  onClose?: () => void;
}

interface Template {
  id: string;
  name: string;
  category: string;
  content: string;
  tags: string[];
}

const TEMPLATES: Template[] = [
  {
    id: 'simple-welcome',
    name: 'Simple Welcome',
    category: 'Basic',
    tags: ['simple', 'friendly'],
    content: `<p><strong>Welcome to our lobby!</strong></p><p>We're excited to have you here. Feel free to introduce yourself and join the conversation.</p>`,
  },
  {
    id: 'fancy-welcome',
    name: 'Fancy Welcome',
    category: 'Stylish',
    tags: ['fancy', 'unicode'],
    content: `<p>🎉 <strong>𝐖𝐞𝐥𝐜𝐨𝐦𝐞 𝐭𝐨 𝐭𝐡𝐞 𝐋𝐨𝐛𝐛𝐲</strong> 🎉</p><p>We're 𝘵𝘩𝘳𝘪𝘭𝘭𝘦𝘥 to have you join our anonymous community!</p><p>✨ Feel free to customize your alias and start chatting ✨</p>`,
  },
  {
    id: 'rules-focused',
    name: 'Rules Focused',
    category: 'Formal',
    tags: ['rules', 'guidelines'],
    content: `<p><strong>Welcome to the Lobby!</strong></p><p>Before you begin, please familiarize yourself with our community guidelines:</p><p>• Be respectful to all members<br>• No spam or harassment<br>• Keep conversations civil<br>• Report any issues to moderators</p><p>Enjoy your stay! 🌟</p>`,
  },
  {
    id: 'aesthetic-welcome',
    name: 'Aesthetic Welcome',
    category: 'Stylish',
    tags: ['aesthetic', 'vaporwave'],
    content: `<p>✧･ﾟ: *✧･ﾟ:* 　　 *:･ﾟ✧*:･ﾟ✧</p><p>𝒲𝑒𝓁𝒸𝑜𝓂𝑒　𝓉𝑜　𝓉𝒽𝑒　𝐿𝑜𝒷𝒷𝓎</p><p>✧･ﾟ: *✧･ﾟ:* 　　 *:･ﾟ✧*:･ﾟ✧</p><p>You're now part of our anonymous community 💫</p>`,
  },
  {
    id: 'emoji-rich',
    name: 'Emoji Rich',
    category: 'Fun',
    tags: ['emoji', 'colorful'],
    content: `<p>🎊 <strong>WELCOME!</strong> 🎊</p><p>👋 Hi there! We're so happy you're here!</p><p>🗣️ Jump into conversations<br>👥 Meet amazing people<br>🎭 Stay anonymous<br>💬 Have fun!</p><p>Let's make this lobby awesome together! 🚀</p>`,
  },
  {
    id: 'minimal',
    name: 'Minimal',
    category: 'Basic',
    tags: ['minimal', 'clean'],
    content: `<p><strong>Welcome.</strong></p><p>You've joined the lobby. Start chatting whenever you're ready.</p>`,
  },
  {
    id: 'info-rich',
    name: 'Information Rich',
    category: 'Formal',
    tags: ['detailed', 'informative'],
    content: `<p><strong>🎯 Welcome to Our Anonymous Lobby!</strong></p><p><u>What is this?</u><br>This is a private, anonymous chat space where you can freely express yourself.</p><p><u>Getting Started:</u><br>1. Set your custom alias and icon<br>2. Read the community rules<br>3. Start participating in discussions</p><p><u>Need Help?</u><br>Use /help to see available commands or contact a moderator.</p><p>Enjoy your time here! ✨</p>`,
  },
  {
    id: 'playful',
    name: 'Playful Welcome',
    category: 'Fun',
    tags: ['playful', 'casual'],
    content: `<p>🎮 <strong>Player entered the lobby!</strong> 🎮</p><p>Hey there, adventurer! 🗺️</p><p>You've just unlocked: <em>The Anonymous Chat Zone</em></p><p>🏆 Quest: Make new friends<br>💎 Reward: Great conversations<br>⚔️ Difficulty: Easy Mode</p><p>Ready? Let's go! 🚀</p>`,
  },
  {
    id: 'professional',
    name: 'Professional',
    category: 'Formal',
    tags: ['professional', 'business'],
    content: `<p><strong>Welcome to the Discussion Lobby</strong></p><p>Thank you for joining our community. This space facilitates anonymous, constructive dialogue among members.</p><p><strong>Key Features:</strong></p><p>• Anonymous participation<br>• Moderated environment<br>• Community-driven discussions<br>• Privacy-focused platform</p><p>We look forward to your contributions.</p>`,
  },
  {
    id: 'warm-friendly',
    name: 'Warm & Friendly',
    category: 'Basic',
    tags: ['warm', 'friendly'],
    content: `<p>🤗 <strong>Hello and welcome!</strong></p><p>We're absolutely delighted to have you join our little corner of the internet! 💕</p><p>This is a safe, anonymous space where you can be yourself and connect with others.</p><p>Don't be shy – jump in and say hello! We're all friends here. 😊</p><p>Can't wait to get to know you! ✨</p>`,
  },
  {
    id: 'retro',
    name: 'Retro Style',
    category: 'Stylish',
    tags: ['retro', 'vintage'],
    content: `<p>░▒▓█ <strong>𝚆 𝙴 𝙻 𝙲 𝙾 𝙼 𝙴</strong> █▓▒░</p><p>▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒</p><p>You've connected to:</p><p><code>ANONYMOUS_LOBBY.exe</code></p><p>Status: ✓ Connected<br>Users: Online<br>Mode: Anonymous</p><p>▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒</p><p>Type to begin... █</p>`,
  },
  {
    id: 'mysterious',
    name: 'Mysterious',
    category: 'Fun',
    tags: ['mysterious', 'dark'],
    content: `<p>🌙 <strong><em>Welcome to the Shadows...</em></strong> 🌙</p><p>You have entered a realm where identities fade and voices echo freely.</p><p>✨ Your presence is acknowledged<br>🎭 Your identity remains concealed<br>💬 Your voice will be heard</p><p><tg-spoiler>Speak freely, stranger. You are among equals here.</tg-spoiler></p>`,
  },
  {
    id: 'celebration',
    name: 'Celebration',
    category: 'Fun',
    tags: ['party', 'celebration'],
    content: `<p>🎉🎊🎈 <strong>IT'S PARTY TIME!</strong> 🎈🎊🎉</p><p>🥳 YOU JUST JOINED THE COOLEST LOBBY EVER! 🥳</p><p>🌟 Confetti is falling! 🌟<br>🎵 Music is playing! 🎵<br>💃 People are vibing! 💃</p><p>Get ready for an AWESOME time! 🚀✨🔥</p>`,
  },
  {
    id: 'zen',
    name: 'Zen & Peaceful',
    category: 'Basic',
    tags: ['zen', 'peaceful'],
    content: `<p>🕊️ <strong>Welcome, Friend</strong> 🕊️</p><p>Take a deep breath. You've arrived at a peaceful space for mindful conversation.</p><p>Here, we value:</p><p>☮️ Respect<br>🧘 Thoughtfulness<br>💚 Kindness<br>🌱 Growth</p><p>May your time here be enlightening. 🌸</p>`,
  },
  {
    id: 'tech-savvy',
    name: 'Tech Savvy',
    category: 'Stylish',
    tags: ['tech', 'modern'],
    content: `<p><code>> system.welcome.init()</code></p><p><strong>// NEW USER DETECTED</strong></p><p><code>User {<br>　status: "connected",<br>　mode: "anonymous",<br>　permissions: ["chat", "interact"],<br>　welcome_msg: "Hello, World!"<br>}</code></p><p>✓ Authentication: Anonymous<br>✓ Connection: Secure<br>✓ Ready: True</p><p><code>> chat.start()</code></p>`,
  },
];

const CATEGORIES = Array.from(new Set(TEMPLATES.map(t => t.category)));

export function WelcomeMessageTemplates({ onSelect, onClose }: WelcomeMessageTemplatesProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const filteredTemplates = TEMPLATES.filter((template) => {
    const matchesSearch =
      searchQuery === '' ||
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      selectedCategory === 'All' || template.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const getPreviewText = (html: string): string => {
    // Remove HTML tags for preview
    const text = html
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return text.length > 100 ? text.substring(0, 100) + '...' : text;
  };

  return (
    <div className="w-full border rounded-lg bg-background">
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Message Templates</h3>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          )}
        </div>

        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedCategory === 'All' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('All')}
          >
            All
          </Button>
          {CATEGORIES.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </Button>
          ))}
        </div>
      </div>

      <ScrollArea className="h-[400px] p-4">
        <div className="space-y-3">
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No templates found matching your search.
            </div>
          ) : (
            filteredTemplates.map((template) => (
              <button
                key={template.id}
                onClick={() => onSelect(template)}
                className="w-full text-left p-4 border rounded-lg hover:bg-accent hover:border-primary transition-colors group"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h4 className="font-semibold text-sm group-hover:text-primary">
                      {template.name}
                    </h4>
                    <Badge variant="secondary" className="text-xs mt-1">
                      {template.category}
                    </Badge>
                  </div>
                  <Check className="h-4 w-4 opacity-0 group-hover:opacity-100 text-primary transition-opacity" />
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {getPreviewText(template.content)}
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {template.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
