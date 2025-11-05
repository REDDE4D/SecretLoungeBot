'use client';

import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface EmojiSymbolPickerProps {
  onSelect: (symbol: string) => void;
}

interface EmojiCategory {
  name: string;
  id: string;
  emojis: string[];
}

const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    name: 'Smileys',
    id: 'smileys',
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '🫠', '😉', '😊', '😇',
      '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑',
      '🤗', '🤭', '🫢', '🫣', '🤫', '🤔', '🫡', '🤐', '🤨', '😐', '😑', '😶', '🫥', '😶‍🌫️',
      '😏', '😒', '🙄', '😬', '😮‍💨', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕',
    ],
  },
  {
    name: 'Gestures',
    id: 'gestures',
    emojis: [
      '👋', '🤚', '🖐️', '✋', '🖖', '🫱', '🫲', '🫳', '🫴', '👌', '🤌', '🤏', '✌️', '🤞',
      '🫰', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '🫵', '👍', '👎', '✊',
      '👊', '🤛', '🤜', '👏', '🙌', '🫶', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪',
    ],
  },
  {
    name: 'Hearts',
    id: 'hearts',
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '❤️‍🔥', '❤️‍🩹', '💔', '❣️',
      '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '♥️', '💌', '💋', '💏', '💑',
    ],
  },
  {
    name: 'Animals',
    id: 'animals',
    emojis: [
      '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐻‍❄️', '🐨', '🐯', '🦁', '🐮', '🐷',
      '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆',
      '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🪱', '🐛', '🦋', '🐌', '🐞', '🐜',
      '🦟', '🦗', '🕷️', '🕸️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞',
    ],
  },
  {
    name: 'Food',
    id: 'food',
    emojis: [
      '🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭',
      '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🫑', '🌽', '🥕', '🫒',
      '🧄', '🧅', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🧈', '🥞',
      '🧇', '🥓', '🥩', '🍗', '🍖', '🦴', '🌭', '🍔', '🍟', '🍕', '🫓', '🥪', '🥙', '🧆',
    ],
  },
  {
    name: 'Activities',
    id: 'activities',
    emojis: [
      '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒',
      '🏑', '🥍', '🏏', '🪃', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹',
      '🛼', '🛷', '⛸️', '🥌', '🎿', '⛷️', '🏂', '🪂', '🏋️', '🤼', '🤸', '🤺', '⛹️', '🤾',
      '🏌️', '🏇', '🧘', '🏊', '🤽', '🚣', '🧗', '🚵', '🚴', '🏆', '🥇', '🥈', '🥉', '🏅',
    ],
  },
  {
    name: 'Travel',
    id: 'travel',
    emojis: [
      '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', '🚜',
      '🦯', '🦽', '🦼', '🛴', '🚲', '🛵', '🏍️', '🛺', '🚨', '🚔', '🚍', '🚘', '🚖', '🚡',
      '🚠', '🚟', '🚃', '🚋', '🚞', '🚝', '🚄', '🚅', '🚈', '🚂', '🚆', '🚇', '🚊', '🚉',
      '✈️', '🛫', '🛬', '🛩️', '💺', '🛰️', '🚁', '🛸', '🚀', '🛶', '⛵', '🚤', '🛥️', '🛳️',
    ],
  },
  {
    name: 'Objects',
    id: 'objects',
    emojis: [
      '⌚', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '🕹️', '🗜️', '💾', '💿', '📀',
      '📼', '📷', '📸', '📹', '🎥', '📽️', '🎞️', '📞', '☎️', '📟', '📠', '📺', '📻', '🎙️',
      '🎚️', '🎛️', '🧭', '⏱️', '⏲️', '⏰', '🕰️', '⌛', '⏳', '📡', '🔋', '🔌', '💡', '🔦',
      '🕯️', '🪔', '🧯', '🛢️', '💸', '💵', '💴', '💶', '💷', '🪙', '💰', '💳', '💎', '⚖️',
    ],
  },
];

const SYMBOL_CATEGORIES = [
  {
    name: 'Arrows',
    id: 'arrows',
    symbols: [
      '←', '→', '↑', '↓', '↔', '↕', '↖', '↗', '↘', '↙', '↩', '↪', '⤴', '⤵',
      '⇐', '⇒', '⇑', '⇓', '⇔', '⇕', '⇖', '⇗', '⇘', '⇙', '➡', '⬅', '⬆', '⬇',
      '▶', '◀', '▲', '▼', '►', '◄', '▴', '▾', '☞', '☜', '☝', '☟',
    ],
  },
  {
    name: 'Math',
    id: 'math',
    symbols: [
      '+', '−', '×', '÷', '=', '≠', '≈', '≡', '≤', '≥', '<', '>', '±', '∓',
      '∞', '∑', '∏', '∫', '∂', '∆', '∇', '√', '∛', '∜', '∝', '∟', '∠', '∡',
      '°', '′', '″', '‰', '‱', '℅', '%', '‰', 'π', 'Ω', 'μ', 'Σ',
    ],
  },
  {
    name: 'Currency',
    id: 'currency',
    symbols: [
      '$', '¢', '£', '¤', '¥', '₠', '₡', '₢', '₣', '₤', '₥', '₦', '₧', '₨',
      '₩', '₪', '₫', '€', '₭', '₮', '₯', '₰', '₱', '₲', '₳', '₴', '₵', '₶',
      '₷', '₸', '₹', '₺', '₻', '₼', '₽', '₾', '₿',
    ],
  },
  {
    name: 'Punctuation',
    id: 'punctuation',
    symbols: [
      '!', '?', '.', ',', ';', ':', '¡', '¿', '‽', '⁈', '⁉', '…', '·', '•',
      '‣', '⁃', '※', '⁂', '‧', '°', '′', '″', '‴', '\u201C', '\u201D', '\u2018', '\u2019', '‹', '›',
      '«', '»', '‐', '‑', '‒', '–', '—', '―', '_', '‾', '⁓', '∼',
    ],
  },
  {
    name: 'Brackets',
    id: 'brackets',
    symbols: [
      '(', ')', '[', ']', '{', '}', '⟨', '⟩', '⟪', '⟫', '⟬', '⟭', '⟮', '⟯',
      '⌈', '⌉', '⌊', '⌋', '⦃', '⦄', '⦅', '⦆', '⦇', '⦈', '⦉', '⦊', '⦋', '⦌',
      '⦍', '⦎', '⦏', '⦐', '⦑', '⦒', '⦓', '⦔', '⦕', '⦖', '⦗', '⦘',
    ],
  },
  {
    name: 'Stars',
    id: 'stars',
    symbols: [
      '★', '☆', '✦', '✧', '✨', '✩', '✪', '✫', '✬', '✭', '✮', '✯', '✰', '✱',
      '⋆', '※', '⁂', '⁎', '⁑', '⁕', '✢', '✣', '✤', '✥', '❋', '❊', '❉', '❈',
      '❇', '❆', '❅', '❄', '❃', '❂', '❁', '❀', '✿', '❖', '✹', '✺',
    ],
  },
  {
    name: 'Shapes',
    id: 'shapes',
    symbols: [
      '●', '○', '◉', '◎', '◐', '◑', '◒', '◓', '◔', '◕', '◖', '◗', '◘', '◙',
      '■', '□', '▢', '▣', '▤', '▥', '▦', '▧', '▨', '▩', '▪', '▫', '▬', '▭',
      '▲', '△', '▴', '▵', '▶', '▷', '▸', '▹', '►', '▻', '▼', '▽', '▾', '▿',
      '◀', '◁', '◂', '◃', '◄', '◅', '◆', '◇', '◈', '◊', '○', '◌', '◍', '◎',
    ],
  },
  {
    name: 'Misc',
    id: 'misc',
    symbols: [
      '©', '®', '™', '℗', '℠', '℡', '№', '℅', '℆', 'ℓ', '℞', '℟', '⅍', '℧',
      '‰', '‱', '¶', '§', '†', '‡', '※', '⁂', '⁜', '⁝', '⁞', '☞', '☜', '☝',
      '☟', '☚', '☛', '☠', '☢', '☣', '☮', '☯', '☸', '☹', '☺', '☻',
    ],
  },
];

export function EmojiSymbolPicker({ onSelect }: EmojiSymbolPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filterItems = (items: string[]) => {
    if (!searchQuery) return items;
    // For emojis/symbols, we can't really search by text, so just return all
    return items;
  };

  return (
    <div className="w-[320px] border rounded-lg bg-background shadow-lg">
      <div className="p-2 border-b">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
      </div>

      <Tabs defaultValue="smileys" className="w-full">
        <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0 h-auto overflow-x-auto flex-wrap">
          <TabsTrigger value="smileys" className="rounded-none text-xs px-3 py-2">
            😀
          </TabsTrigger>
          <TabsTrigger value="gestures" className="rounded-none text-xs px-3 py-2">
            👋
          </TabsTrigger>
          <TabsTrigger value="hearts" className="rounded-none text-xs px-3 py-2">
            ❤️
          </TabsTrigger>
          <TabsTrigger value="animals" className="rounded-none text-xs px-3 py-2">
            🐶
          </TabsTrigger>
          <TabsTrigger value="food" className="rounded-none text-xs px-3 py-2">
            🍕
          </TabsTrigger>
          <TabsTrigger value="activities" className="rounded-none text-xs px-3 py-2">
            ⚽
          </TabsTrigger>
          <TabsTrigger value="travel" className="rounded-none text-xs px-3 py-2">
            ✈️
          </TabsTrigger>
          <TabsTrigger value="objects" className="rounded-none text-xs px-3 py-2">
            💡
          </TabsTrigger>
          <TabsTrigger value="symbols" className="rounded-none text-xs px-3 py-2">
            ★
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="h-[300px]">
          {EMOJI_CATEGORIES.map((category) => (
            <TabsContent key={category.id} value={category.id} className="m-0 p-2">
              <div className="grid grid-cols-8 gap-1">
                {filterItems(category.emojis).map((emoji, index) => (
                  <button
                    key={index}
                    onClick={() => onSelect(emoji)}
                    className="w-9 h-9 flex items-center justify-center text-xl hover:bg-accent rounded transition-colors"
                    title={emoji}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </TabsContent>
          ))}

          <TabsContent value="symbols" className="m-0 p-2">
            <div className="space-y-4">
              {SYMBOL_CATEGORIES.map((category) => (
                <div key={category.id}>
                  <h4 className="text-xs font-semibold text-muted-foreground mb-2">
                    {category.name}
                  </h4>
                  <div className="grid grid-cols-10 gap-1">
                    {category.symbols.map((symbol, index) => (
                      <button
                        key={index}
                        onClick={() => onSelect(symbol)}
                        className="w-7 h-7 flex items-center justify-center text-sm hover:bg-accent rounded transition-colors"
                        title={symbol}
                      >
                        {symbol}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
