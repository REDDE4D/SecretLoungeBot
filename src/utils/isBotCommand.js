// src/utils/isBotCommand.js
export default function isBotCommand(msg = {}) {
  // Consider both text and caption, and check Telegram-provided entities
  const textStartsWithSlash =
    (msg.text && msg.text.startsWith("/")) ||
    (msg.caption && msg.caption.startsWith("/"));

  const entities = msg.entities || msg.caption_entities || [];
  const hasLeadingCommandEntity = entities.some(
    (e) => e.type === "bot_command" && e.offset === 0
  );

  return Boolean(textStartsWithSlash && hasLeadingCommandEntity);
}
