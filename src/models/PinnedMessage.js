import mongoose from "mongoose";

const pinnedMessageSchema = new mongoose.Schema({
  _id: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: ['announcement', 'relayed'],
    default: 'announcement',
    required: true
  },
  message: {
    type: String,
    maxlength: 1000,
    // Required only for announcements
    required: function() {
      return this.type === 'announcement';
    }
  },
  // For relayed pins: map of userId -> messageId
  relayedMessageIds: {
    type: Map,
    of: Number,
    default: () => new Map()
  },
  // Original message info for relayed pins
  originalUserId: {
    type: String
  },
  originalMsgId: {
    type: Number
  },
  pinnedBy: {
    type: String,
    required: true
  },
  pinnedByAlias: {
    type: String,
    required: true
  },
  pinnedAt: {
    type: Date,
    default: Date.now,
    required: true
  }
}, {
  timestamps: false,
  collection: 'pinnedMessages'
});

// MongoDB automatically creates _id index, so we don't need to specify it

// Static method to get next ID
pinnedMessageSchema.statics.getNextId = async function() {
  const lastPin = await this.findOne().sort({ _id: -1 }).lean();
  return lastPin ? lastPin._id + 1 : 1;
};

// Static method to check if max pins reached
pinnedMessageSchema.statics.canAddMore = async function() {
  const count = await this.countDocuments();
  return count < 5;
};

// Static method to get all pins in order
pinnedMessageSchema.statics.getAllPins = async function() {
  return this.find().sort({ _id: 1 }).lean();
};

const PinnedMessage = mongoose.models.PinnedMessage || mongoose.model('PinnedMessage', pinnedMessageSchema);
export default PinnedMessage;
