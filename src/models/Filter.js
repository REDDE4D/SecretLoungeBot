// src/models/Filter.js
import mongoose from "mongoose";

const FilterSchema = new mongoose.Schema(
  {
    pattern: { type: String, required: true }, // Regex pattern or keyword
    isRegex: { type: Boolean, default: false }, // Whether pattern is regex
    createdBy: { type: String, required: true }, // Admin who created filter
    action: {
      type: String,
      enum: ["block", "notify"], // block: prevent message, notify: send notification to admins
      default: "block",
    },
    active: { type: Boolean, default: true },
    notes: { type: String, default: "" }, // Optional description
  },
  { timestamps: true }
);

// Index for active filters
FilterSchema.index({ active: 1 });

const Filter = mongoose.models.Filter || mongoose.model("Filter", FilterSchema);
export default Filter;
