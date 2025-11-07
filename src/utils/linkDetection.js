import { LinkWhitelist } from '../models/LinkWhitelist.js';
import { User } from '../models/User.js';

/**
 * URL Detection Patterns
 */
const URL_PATTERNS = [
  // Full URLs with protocol
  /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/gi,
  // URLs without protocol
  /(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/gi,
  // t.me links
  /t\.me\/[a-zA-Z0-9_]+/gi,
  // Telegram username links
  /@[a-zA-Z0-9_]{5,}/g,
];

/**
 * Extract all URLs from text
 * @param {string} text - The text to search for URLs
 * @returns {string[]} Array of extracted URLs
 */
export function extractURLs(text) {
  if (!text || typeof text !== 'string') return [];

  const urls = new Set();

  for (const pattern of URL_PATTERNS) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      urls.add(match[0].toLowerCase().trim());
    }
  }

  return Array.from(urls);
}

/**
 * Extract domain from URL
 * @param {string} url - The URL to extract domain from
 * @returns {string} The domain
 */
export function extractDomain(url) {
  try {
    // Add protocol if missing
    const urlWithProtocol = url.startsWith('http') ? url : `http://${url}`;
    const urlObj = new URL(urlWithProtocol);
    return urlObj.hostname.toLowerCase();
  } catch (err) {
    // Fallback for malformed URLs
    const match = url.match(/(?:https?:\/\/)?(?:www\.)?([^/:\s]+)/i);
    return match ? match[1].toLowerCase() : url.toLowerCase();
  }
}

/**
 * Check if a URL is whitelisted
 * @param {string} url - The URL to check
 * @returns {Promise<boolean>} True if whitelisted
 */
export async function isURLWhitelisted(url) {
  const domain = extractDomain(url);
  const normalizedURL = url.toLowerCase().trim();

  // Check for exact full URL match
  const fullURLMatch = await LinkWhitelist.findOne({
    pattern: normalizedURL,
    type: 'full_url',
    active: true,
  });

  if (fullURLMatch) return true;

  // Check for domain match
  const domainMatch = await LinkWhitelist.findOne({
    pattern: domain,
    type: 'domain',
    active: true,
  });

  if (domainMatch) return true;

  // Check for subdomain matches (e.g., "example.com" should match "sub.example.com")
  const domainParts = domain.split('.');
  if (domainParts.length > 2) {
    // Try matching parent domain (e.g., "example.com" from "sub.example.com")
    const parentDomain = domainParts.slice(-2).join('.');
    const parentMatch = await LinkWhitelist.findOne({
      pattern: parentDomain,
      type: 'domain',
      active: true,
    });
    if (parentMatch) return true;
  }

  return false;
}

/**
 * Check if user can post links
 * @param {string} userId - Telegram user ID
 * @returns {Promise<boolean>} True if user can post links
 */
export async function canUserPostLinks(userId) {
  const user = await User.findById(userId);
  if (!user) return false;

  // Owner, admins, and mods can always post links
  if (['owner', 'admin', 'mod'].includes(user.role)) return true;

  // Check explicit permission
  return user.canPostLinks === true;
}

/**
 * Check if message contains blocked links
 * @param {string} text - The message text to check
 * @param {string} userId - Telegram user ID
 * @returns {Promise<{blocked: boolean, urls: string[], blockedUrls: string[]}>}
 */
export async function checkMessageForBlockedLinks(text, userId) {
  if (!text || typeof text !== 'string') {
    return { blocked: false, urls: [], blockedUrls: [] };
  }

  const urls = extractURLs(text);

  if (urls.length === 0) {
    return { blocked: false, urls: [], blockedUrls: [] };
  }

  // Check if user has permission to post any links
  const hasPermission = await canUserPostLinks(userId);
  if (hasPermission) {
    return { blocked: false, urls, blockedUrls: [] };
  }

  // Check each URL against whitelist
  const blockedUrls = [];
  for (const url of urls) {
    const whitelisted = await isURLWhitelisted(url);
    if (!whitelisted) {
      blockedUrls.push(url);
    }
  }

  return {
    blocked: blockedUrls.length > 0,
    urls,
    blockedUrls,
  };
}

/**
 * Format blocked link message
 * @param {string[]} blockedUrls - Array of blocked URLs
 * @returns {string} Formatted error message
 */
export function formatBlockedLinkMessage(blockedUrls) {
  if (blockedUrls.length === 0) return '';

  const urlList = blockedUrls.map((url) => `  • ${url}`).join('\n');

  return [
    '🚫 <b>Link Blocked</b>',
    '',
    'Your message contains links that are not allowed:',
    urlList,
    '',
    'Only whitelisted links can be posted in the lobby.',
    'Contact an administrator if you believe this is an error.',
  ].join('\n');
}
