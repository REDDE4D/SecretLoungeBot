/**
 * Application-wide constants and configuration values
 */

export const TIMING = {
  // Message relay timing
  QUOTE_LINK_TTL_MS: 2 * 60 * 1000,      // 2 minutes - TTL for temporary reply mappings
  RELAY_DELAY_MS: 200,                    // Delay between individual message relays
  MEDIA_GROUP_RELAY_DELAY_MS: 1500,       // Delay before relaying complete media group
  MEDIA_GROUP_BUFFER_CLEANUP_MS: 20000,   // Cleanup time for media group buffers

  // User activity thresholds
  IDLE_THRESHOLD_MS: 15 * 60 * 1000,      // 15 minutes - user considered idle
  OFFLINE_THRESHOLD_MS: 60 * 60 * 1000,   // 60 minutes - user considered offline

  // Cleanup intervals
  ANNOUNCEMENT_CACHE_CLEANUP_MS: 30 * 60 * 1000, // 30 minutes - status announcement cache cleanup
};

export const COMPLIANCE = {
  INACTIVITY_KICK_DAYS: 2,                // Days of inactivity before auto-kick
  FIRST_24H_MEDIA_REQUIREMENT: 10,        // Media items required in first 24 hours
  DAILY_MEDIA_REQUIREMENT: 1,             // Media items required per day
  MAX_WARNINGS: 3,                        // Maximum warnings before ban
};

export const LIMITS = {
  MAX_ALIAS_LENGTH: 32,                   // Maximum characters in alias
  MIN_ALIAS_LENGTH: 2,                    // Minimum characters in alias
  MAX_INVITE_NOTE_LENGTH: 500,            // Maximum characters in invite note
  MAX_COMMAND_RESULT_LENGTH: 4000,        // Maximum length for command output messages
  BATCH_DELETE_SIZE: 10,                  // Number of messages to delete in parallel
};

export const RETRY = {
  MAX_ATTEMPTS: 3,                        // Maximum retry attempts for Telegram API calls
  BASE_DELAY_MS: 1000,                    // Base delay for exponential backoff
};
