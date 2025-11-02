import { Schema, model } from "mongoose";

const instanceSchema = new Schema({
  _id: {
    type: String,
    required: true,
    default: "singleton",
  },
  instanceId: {
    type: String,
    required: true,
    unique: true,
  },
  firstStarted: {
    type: Date,
    required: true,
    default: Date.now,
  },
});

export const Instance = model("Instance", instanceSchema);
