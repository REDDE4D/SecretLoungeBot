/**
 * PM2 Ecosystem Configuration
 * Manages all TG-Lobby-Bot processes
 *
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 stop all
 *   pm2 restart all
 *   pm2 logs
 *   pm2 monit
 */

module.exports = {
  apps: [
    {
      name: "lobby-bot",
      script: "./src/index.js",
      cwd: "./",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
      },
      error_file: "./logs/bot-error.log",
      out_file: "./logs/bot-out.log",
      log_file: "./logs/bot-combined.log",
      time: true,
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    },
    {
      name: "dashboard-api",
      script: "./server.js",
      cwd: "./dashboard-api",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
        API_PORT: 3001,
        MONGO_URI: "mongodb+srv://wunschtop10:evb5AT0X2ylgtgi8@tgbot.i03qpxk.mongodb.net/?retryWrites=true&w=majority&appName=lobbyBot2",
        DBNAME: "lobbyBot2",
        JWT_ACCESS_SECRET: "5e359f5f960af8fce5a499d97602e3b67e91ff52c536d2459e51862fa33144d8",
        JWT_REFRESH_SECRET: "f9d832be87ee70ec38e2d2d68d04cbc95ae44cb5a449c76348ef6610a2885f13",
        BOT_TOKEN: "8305346816:AAFWvvO0lgvqgIXvas9kZpj8EG6MKOIIsdw",
        DASHBOARD_URL: "https://bot.redde4d.it",
        PRODUCTION_DASHBOARD_URL: "https://bot.redde4d.it",
        PRODUCTION_API_URL: "https://api.redde4d.it",
      },
      error_file: "../logs/api-error.log",
      out_file: "../logs/api-out.log",
      log_file: "../logs/api-combined.log",
      time: true,
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    },
    {
      name: "dashboard-frontend",
      script: "npm",
      args: "start",
      cwd: "./dashboard",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      error_file: "../logs/frontend-error.log",
      out_file: "../logs/frontend-out.log",
      log_file: "../logs/frontend-combined.log",
      time: true,
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    },
  ],

  // Deployment configuration (optional)
  deploy: {
    production: {
      user: "node",
      host: "bot.redde4d.it",
      ref: "origin/main",
      repo: "git@github.com:yourusername/TG-Lobby-V2.git",
      path: "/var/www/tg-lobby-bot",
      "post-deploy":
        "npm install && cd dashboard-api && npm install && cd ../dashboard && npm install && npm run build && pm2 reload ecosystem.config.js",
      env: {
        NODE_ENV: "production",
      },
    },
  },
};
