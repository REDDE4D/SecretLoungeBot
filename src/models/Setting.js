// src/models/Setting.js
import mongoose from "mongoose";

const RuleSchema = new mongoose.Schema({
  emoji: { type: String, default: "📌" },
  text: { type: String, required: true },
}, { _id: false });

const SettingSchema = new mongoose.Schema(
  {
    // singleton doc: {_id: 'global'}
    _id: { type: String, default: "global" },
    inviteOnly: { type: Boolean, default: false },
    rules: { type: [RuleSchema], default: [] },
    // Slowmode settings
    slowmodeEnabled: { type: Boolean, default: false },
    slowmodeSeconds: { type: Number, default: 30 }, // Delay between messages in seconds
    // Spam detection configuration (stored as JSON object)
    spamDetectionConfig: { type: mongoose.Schema.Types.Mixed, default: {} },
    // Maintenance mode settings
    maintenanceMode: { type: Boolean, default: false },
    maintenanceMessage: { type: String, default: "🔧 The lobby is currently undergoing maintenance. Please check back later." },
    // Welcome message settings
    welcomeEnabled: { type: Boolean, default: true },
    welcomeMessage: {
      type: String,
      default: "👋 Welcome to the lobby! Feel free to introduce yourself and chat with others. Use /help to see all available commands."
    },
  },
  { timestamps: true }
);

const Setting =
  mongoose.models.Setting || mongoose.model("Setting", SettingSchema);
export default Setting;
