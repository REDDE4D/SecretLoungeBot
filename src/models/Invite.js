// src/models/Invite.js
import mongoose from "mongoose";

const InviteSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true, index: true, required: true },
    createdBy: { type: String, required: true }, // admin userId
    maxUses: { type: Number, default: 1, min: 1 },
    usedCount: { type: Number, default: 0, min: 0 },
    expiresAt: { type: Date, default: null }, // null = no expiry
    active: { type: Boolean, default: true }, // revoked if false
    notes: { type: String, default: "" }, // optional
  },
  { timestamps: true }
);

// Convenience computed status (not stored)
InviteSchema.virtual("isExpired").get(function () {
  return this.expiresAt && this.expiresAt.getTime() < Date.now();
});
InviteSchema.virtual("isExhausted").get(function () {
  return typeof this.maxUses === "number" && this.usedCount >= this.maxUses;
});

const Invite = mongoose.models.Invite || mongoose.model("Invite", InviteSchema);
export default Invite;
