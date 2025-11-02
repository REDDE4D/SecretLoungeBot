/**
 * Parse duration strings for temporary restrictions (ban, mute)
 * Accepts formats like: "10s", "30m", "1h", "2d"
 * Returns milliseconds or null if invalid
 * @param {string} input - Duration string
 * @returns {number|null} Duration in milliseconds
 */
export function parseDuration(input) {
  if (!input) return 60 * 60 * 1000; // default: 1 hour

  const match = /^(\d+)([smhd])$/.exec(input.toLowerCase());
  if (!match) return null;

  const value = parseInt(match[1]);
  const unit = match[2];

  switch (unit) {
    case "s":
      return value * 1000;
    case "m":
      return value * 60 * 1000;
    case "h":
      return value * 60 * 60 * 1000;
    case "d":
      return value * 24 * 60 * 60 * 1000;
  }

  return null;
}

/**
 * Parse expiry strings for invites
 * Accepts:
 * - Duration formats: "7d", "24h", "90m", "3600s", "2w"
 * - Absolute ISO dates: "2025-09-10T12:00:00Z"
 * - "none" or null for no expiry
 * @param {string} input - Expiry string
 * @returns {Date|null} Expiry date or null for no expiry
 */
export function parseExpiry(input) {
  if (!input || String(input).toLowerCase() === "none") return null;

  const str = String(input).trim();

  // Try parsing as ISO date
  const asDate = new Date(str);
  if (!Number.isNaN(asDate.getTime()) && /[-:TZ]/.test(str)) {
    return asDate;
  }

  // Parse duration format
  const match = str.match(/^(\d+)\s*([smhdw])$/i);
  if (!match) return null;

  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  const now = Date.now();

  const multipliers = {
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
    w: 604_800_000,
  };

  return new Date(now + value * multipliers[unit]);
}
