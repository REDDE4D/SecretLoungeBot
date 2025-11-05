import crypto from "crypto";

/**
 * Verify Telegram Login Widget authentication data
 *
 * @param {Object} authData - Data from Telegram Login Widget
 * @param {string} botToken - Telegram bot token
 * @returns {boolean} - True if auth data is valid
 *
 * Telegram sends:
 * - id: user's Telegram ID
 * - first_name: user's first name
 * - last_name: user's last name (optional)
 * - username: user's username (optional)
 * - photo_url: user's profile photo URL (optional)
 * - auth_date: Unix timestamp of authentication
 * - hash: HMAC-SHA256 signature
 */
export function verifyTelegramAuth(authData, botToken) {
  const { hash, ...data } = authData;

  // Check if hash is present
  if (!hash) {
    return false;
  }

  // Check if auth_date is within 24 hours
  const authDate = parseInt(data.auth_date, 10);
  const currentTime = Math.floor(Date.now() / 1000);

  if (currentTime - authDate > 86400) {
    // Auth data is older than 24 hours
    return false;
  }

  // Create data check string
  const checkArr = Object.keys(data)
    .filter(key => data[key] !== undefined && data[key] !== null)
    .sort()
    .map(key => `${key}=${data[key]}`);

  const dataCheckString = checkArr.join("\n");

  // Create secret key from bot token
  const secretKey = crypto
    .createHash("sha256")
    .update(botToken)
    .digest();

  // Calculate HMAC-SHA256 signature
  const hmac = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  // Compare signatures
  return hmac === hash;
}

/**
 * Extract user info from Telegram auth data
 *
 * @param {Object} authData - Validated auth data from Telegram
 * @returns {Object} - User info
 */
export function extractUserInfo(authData) {
  return {
    id: String(authData.id),
    firstName: authData.first_name,
    lastName: authData.last_name || null,
    username: authData.username || null,
    photoUrl: authData.photo_url || null,
  };
}
