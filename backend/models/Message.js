import mongoose from 'mongoose';

const attachmentSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: [true, 'Attachment URL is required'],
      trim: true,
    },
    fileType: {
      type: String,
      enum: ['image', 'pdf', 'document', 'file'],
      default: 'image',
    },
    fileName: {
      type: String,
      trim: true,
      default: 'attachment',
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    public_id: {
      type: String,
      default: '',
    },
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: [true, 'Conversation reference is required'],
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Sender reference is required'],
      index: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recipient reference is required'],
      index: true,
    },
    text: {
      type: String,
      required: [true, 'Message text content cannot be empty'],
      trim: true,
      maxlength: [5000, 'Message text cannot exceed 5000 characters'],
    },
    messageType: {
      type: String,
      enum: ['text', 'image', 'file', 'pdf', 'document', 'system'],
      default: 'text',
      index: true,
    },
    attachments: [attachmentSchema],
    status: {
      type: String,
      enum: ['sent', 'delivered', 'seen'],
      default: 'sent',
      index: true,
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual Alias: receiver -> recipient
messageSchema.virtual('receiver').get(function () {
  return this.recipient;
});

// Virtual Helper: delivered -> boolean
messageSchema.virtual('delivered').get(function () {
  return this.status === 'delivered' || this.status === 'seen';
});

// Virtual Helper: seen -> boolean
messageSchema.virtual('seen').get(function () {
  return this.status === 'seen' || this.isRead;
});

// Indexing for Fast Querying
messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ sender: 1, recipient: 1 });
messageSchema.index({ text: 'text' });

export const Message = mongoose.model('Message', messageSchema);
