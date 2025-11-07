"use client";

import { useState, useRef, useEffect } from "react";

interface EmojiPickerProps {
  value: string;
  onChange: (emoji: string) => void;
  label?: string;
  placeholder?: string;
}

// Common emojis for role badges
const COMMON_EMOJIS = [
  "👑", // Crown
  "🛡️", // Shield
  "⭐", // Star
  "💎", // Diamond
  "🔱", // Trident
  "⚔️", // Swords
  "🎖️", // Medal
  "🏆", // Trophy
  "👤", // Bust
  "💼", // Briefcase
  "🎯", // Target
  "🔥", // Fire
  "⚡", // Lightning
  "✨", // Sparkles
  "🌟", // Glowing Star
  "💫", // Dizzy
  "🎪", // Circus Tent
  "🎭", // Theater Masks
  "🎨", // Palette
  "🎵", // Music Note
  "🔔", // Bell
  "📌", // Pushpin
  "📍", // Round Pushpin
  "🔖", // Bookmark
];

export default function EmojiPicker({
  value,
  onChange,
  label = "Emoji",
  placeholder = "Select emoji",
}: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customEmoji, setCustomEmoji] = useState("");
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close picker when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen]);

  const handleEmojiSelect = (emoji: string) => {
    onChange(emoji);
    setIsOpen(false);
  };

  const handleCustomEmojiSubmit = () => {
    if (customEmoji.trim()) {
      onChange(customEmoji.trim());
      setCustomEmoji("");
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={pickerRef}>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {label}
      </label>

      {/* Current Emoji Display */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 text-left bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
      >
        {value ? (
          <span className="text-2xl">{value}</span>
        ) : (
          <span className="text-gray-400">{placeholder}</span>
        )}
      </button>

      {/* Emoji Picker Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-2 w-full sm:w-96 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-96 overflow-y-auto">
          <div className="p-4">
            {/* Common Emojis Grid */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Common Role Emojis
              </h3>
              <div className="grid grid-cols-8 gap-2">
                {COMMON_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleEmojiSelect(emoji)}
                    className="text-2xl p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    title={emoji}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Emoji Input */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Custom Emoji
              </h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customEmoji}
                  onChange={(e) => setCustomEmoji(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleCustomEmojiSubmit();
                    }
                  }}
                  placeholder="Paste any emoji..."
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={handleCustomEmojiSubmit}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Clear Button */}
            {value && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    onChange("");
                    setIsOpen(false);
                  }}
                  className="w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  Remove Emoji
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
