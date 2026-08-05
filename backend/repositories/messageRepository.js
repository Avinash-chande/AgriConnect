import { Message } from '../models/Message.js';

export const createMessageRepo = async (messageData) => {
  const message = await Message.create(messageData);
  return await Message.findById(message._id)
    .populate('sender', 'name email role')
    .populate('recipient', 'name email role');
};

export const findMessageByIdRepo = async (messageId) => {
  return await Message.findById(messageId)
    .populate('sender', 'name email role')
    .populate('recipient', 'name email role');
};

export const findMessagesByConversationRepo = async (conversationId, filter = {}, skip = 0, limit = 50) => {
  const queryFilter = {
    conversation: conversationId,
    ...filter,
  };

  return await Message.find(queryFilter)
    .populate('sender', 'name email role')
    .populate('recipient', 'name email role')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

export const countMessagesByConversationRepo = async (conversationId, filter = {}) => {
  return await Message.countDocuments({
    conversation: conversationId,
    ...filter,
  });
};

export const searchMessagesRepo = async (conversationId, searchTerm, skip = 0, limit = 20) => {
  const searchRegex = new RegExp(searchTerm, 'i');
  return await Message.find({
    conversation: conversationId,
    text: searchRegex,
    isDeleted: { $ne: true },
  })
    .populate('sender', 'name email role')
    .populate('recipient', 'name email role')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

export const searchAllUserMessagesRepo = async (conversationIds, searchTerm, skip = 0, limit = 20) => {
  const searchRegex = new RegExp(searchTerm, 'i');
  const query = {
    conversation: { $in: conversationIds },
    text: searchRegex,
    isDeleted: { $ne: true },
  };

  const [messages, total] = await Promise.all([
    Message.find(query)
      .populate('sender', 'name email role')
      .populate('recipient', 'name email role')
      .populate({
        path: 'conversation',
        populate: [
          { path: 'farmer', select: 'name email role' },
          { path: 'worker', select: 'name email role' },
          { path: 'job', select: 'title category' },
        ],
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Message.countDocuments(query),
  ]);

  return { messages, total };
};

export const softDeleteMessageRepo = async (messageId, userId) => {
  return await Message.findByIdAndUpdate(
    messageId,
    {
      $set: {
        isDeleted: true,
        text: 'This message was deleted',
        deletedAt: new Date(),
      },
      $addToSet: { deletedBy: userId },
    },
    { new: true }
  ).populate('sender recipient');
};

export const editMessageRepo = async (messageId, newText) => {
  return await Message.findByIdAndUpdate(
    messageId,
    {
      $set: {
        text: newText,
        isEdited: true,
        editedAt: new Date(),
      },
    },
    { new: true, runValidators: true }
  ).populate('sender recipient');
};

export const markMessagesAsDeliveredRepo = async (conversationId, recipientId) => {
  return await Message.updateMany(
    {
      conversation: conversationId,
      recipient: recipientId,
      status: 'sent',
    },
    {
      $set: {
        status: 'delivered',
        deliveredAt: new Date(),
      },
    }
  );
};

export const markMessagesAsReadRepo = async (conversationId, recipientId) => {
  return await Message.updateMany(
    {
      conversation: conversationId,
      recipient: recipientId,
      isRead: false,
    },
    {
      $set: {
        status: 'seen',
        isRead: true,
        readAt: new Date(),
      },
    }
  );
};
