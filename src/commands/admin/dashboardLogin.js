import { getUserMeta } from '../../users/index.js';
import LoginToken from '../../models/LoginToken.js';
import logger from '../../utils/logger.js';

export const meta = {
  commands: ['dashboardlogin'],
  category: 'admin',
  roleRequired: null, // No role required - handles /start with login token
  description: 'Dashboard QR code login authentication',
  usage: 'Internal - triggered by QR code scan',
  showInMenu: false,
};

/**
 * Register dashboard login handler
 * Handles /start command with login_TOKEN parameter for QR code authentication
 */
export function register(bot) {
  bot.command('start', async (ctx) => {
    const startPayload = ctx.message.text.split(' ')[1];

    // Check if this is a login request
    if (!startPayload || !startPayload.startsWith('login_')) {
      // Not a login request, send welcome message
      return ctx.reply(
        'Welcome to the lobby bot!\n\n' +
        'Use /help to see available commands, or /register to join the lobby.'
      );
    }

    const token = startPayload.replace('login_', '');
    const userId = ctx.from.id.toString();

    try {
      // Check if user is admin or mod
      const user = await getUserMeta(userId);

      if (!user || (user.role !== 'admin' && user.role !== 'mod')) {
        return ctx.reply(
          '❌ Access Denied\n\n' +
          'You do not have permission to access the dashboard. ' +
          'Only administrators and moderators can log in.\n\n' +
          'If you believe this is an error, please contact the bot owner.'
        );
      }

      // Find the login token
      const loginToken = await LoginToken.findOne({ token });

      if (!loginToken) {
        return ctx.reply(
          '❌ Invalid or Expired Token\n\n' +
          'This login link is no longer valid. Please generate a new QR code from the dashboard login page.'
        );
      }

      if (loginToken.authenticated) {
        return ctx.reply(
          '✅ Already Authenticated\n\n' +
          'This login token has already been used. If you need to log in again, please generate a new QR code.'
        );
      }

      // Prepare user data for dashboard authentication
      const userData = {
        id: parseInt(userId),
        first_name: ctx.from.first_name,
        last_name: ctx.from.last_name || '',
        username: ctx.from.username || '',
        auth_date: Math.floor(Date.now() / 1000),
      };

      // Update login token with authentication data
      loginToken.userId = userId;
      loginToken.userData = userData;
      loginToken.authenticated = true;
      await loginToken.save();

      logger.info(`Dashboard login successful for user ${userId}`);

      return ctx.reply(
        '✅ Dashboard Login Successful!\n\n' +
        `Welcome, ${ctx.from.first_name}!\n\n` +
        'You have been authenticated for the dashboard. ' +
        'You can now return to your browser to access the admin panel.\n\n' +
        '🔒 This login session is secure and encrypted.'
      );
    } catch (error) {
      logger.error('Error handling dashboard login', { error: error.message, stack: error.stack });
      return ctx.reply(
        '❌ Authentication Error\n\n' +
        'An error occurred during authentication. Please try again or contact the administrator.'
      );
    }
  });
}
