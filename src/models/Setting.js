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
  },
  { timestamps: true }
);

const Setting =
  mongoose.models.Setting || mongoose.model("Setting", SettingSchema);
export default Setting;
