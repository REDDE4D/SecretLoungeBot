'use client';

import { formatForPreview, getTextLength, TELEGRAM_MESSAGE_LIMIT } from '@/lib/telegram-html';

interface TelegramPreviewProps {
  html: string;
}

/**
 * TelegramPreview component
 * Displays a mock Telegram message showing how the welcome message will appear
 */
export function TelegramPreview({ html }: TelegramPreviewProps) {
  const textLength = getTextLength(html);
  const isOverLimit = textLength > TELEGRAM_MESSAGE_LIMIT;
  const formattedHtml = formatForPreview(html);

  return (
    <div className="flex flex-col h-full">
      {/* Preview Header */}
      <div className="flex items-center justify-between mb-3 pb-3 border-b">
        <h3 className="text-sm font-semibold">Telegram Preview</h3>
        <div className="flex items-center gap-2 text-xs">
          <span className={`font-mono ${isOverLimit ? 'text-red-500 font-bold' : 'text-muted-foreground'}`}>
            {textLength} / {TELEGRAM_MESSAGE_LIMIT}
          </span>
        </div>
      </div>

      {/* Mock Telegram Chat Interface */}
      <div className="flex-1 bg-[#0f1419] rounded-lg p-4 overflow-auto">
        {/* Mock Telegram Header */}
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-700">
          <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
            B
          </div>
          <div>
            <div className="text-white font-semibold text-sm">Lobby Bot</div>
            <div className="text-gray-400 text-xs">online</div>
          </div>
        </div>

        {/* Message Bubble */}
        <div className="flex">
          <div className="max-w-[85%]">
            <div className="bg-[#2b5278] rounded-lg rounded-tl-none p-3 shadow-md">
              {html ? (
                <div
                  className="telegram-message text-white text-sm leading-relaxed break-words"
                  dangerouslySetInnerHTML={{ __html: formattedHtml }}
                />
              ) : (
                <div className="text-gray-400 italic text-sm">
                  Start typing to see preview...
                </div>
              )}
            </div>
            <div className="text-xs text-gray-500 mt-1 px-1">
              {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
      </div>

      {/* Warning if over limit */}
      {isOverLimit && (
        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded text-red-500 text-xs">
          <strong>Warning:</strong> Message exceeds Telegram&apos;s character limit and will be truncated.
        </div>
      )}

      {/* CSS Styles for Telegram formatting */}
      <style jsx>{`
        .telegram-message {
          white-space: pre-wrap;
          word-wrap: break-word;
        }

        .telegram-message :global(.tg-paragraph) {
          margin: 0.5em 0;
        }

        .telegram-message :global(.tg-paragraph:first-child) {
          margin-top: 0;
        }

        .telegram-message :global(.tg-paragraph:last-child) {
          margin-bottom: 0;
        }

        .telegram-message :global(b),
        .telegram-message :global(strong) {
          font-weight: 700;
        }

        .telegram-message :global(i),
        .telegram-message :global(em) {
          font-style: italic;
        }

        .telegram-message :global(u) {
          text-decoration: underline;
        }

        .telegram-message :global(s),
        .telegram-message :global(strike),
        .telegram-message :global(del) {
          text-decoration: line-through;
        }

        .telegram-message :global(code) {
          font-family: 'Courier New', Courier, monospace;
          background-color: rgba(255, 255, 255, 0.1);
          padding: 2px 4px;
          border-radius: 3px;
          font-size: 0.9em;
        }

        .telegram-message :global(pre) {
          background-color: rgba(0, 0, 0, 0.3);
          padding: 8px;
          border-radius: 4px;
          overflow-x: auto;
          margin: 4px 0;
          font-family: 'Courier New', Courier, monospace;
          font-size: 0.85em;
        }

        .telegram-message :global(pre code) {
          background-color: transparent;
          padding: 0;
        }

        .telegram-message :global(a) {
          color: #5eb3f6;
          text-decoration: none;
        }

        .telegram-message :global(a:hover) {
          text-decoration: underline;
        }

        .telegram-message :global(.tg-spoiler) {
          background-color: rgba(255, 255, 255, 0.3);
          color: transparent;
          border-radius: 2px;
          user-select: none;
          cursor: pointer;
          transition: all 0.2s;
        }

        .telegram-message :global(.tg-spoiler:hover) {
          background-color: transparent;
          color: inherit;
        }

        .telegram-message :global(blockquote),
        .telegram-message :global(.tg-blockquote) {
          border-left: 2px solid rgba(255, 255, 255, 0.3);
          padding-left: 10px;
          margin: 4px 0;
          color: rgba(255, 255, 255, 0.8);
        }
      `}</style>
    </div>
  );
}
