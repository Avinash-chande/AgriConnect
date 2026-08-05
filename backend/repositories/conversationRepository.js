import { Conversation } from '../models/Conversation.js';

export const findConversationByParticipantsRepo = async (farmerId, workerId, jobId) => {
  return await Conversation.findOne({ farmer: farmerId, worker: workerId, job: jobId })
    .populate('farmer', 'name email role mobile farmerProfile')
    .populate('worker', 'name email role mobile workerProfile')
    .populate('job', 'title category workType dailyWage')
    .populate('lastMessage');
};

export const findConversationByIdRepo = async (conversationId) => {
  return await Conversation.findById(conversationId)
    .populate('farmer', 'name email role mobile farmerProfile')
    .populate('worker', 'name email role mobile workerProfile')
    .populate('job', 'title category workType dailyWage status')
    .populate('application', 'status coverLetter createdAt')
    .populate('lastMessage');
};

export const findUserConversationsRepo = async (userId, filter = {}, skip = 0, limit = 20) => {
  const queryFilter = {
    participants: userId,
    ...filter,
  };

  return await Conversation.find(queryFilter)
    .populate('farmer', 'name email role mobile farmerProfile')
    .populate('worker', 'name email role mobile workerProfile')
    .populate('job', 'title category workType dailyWage status')
    .populate('lastMessage')
    .sort({ lastMessageAt: -1, updatedAt: -1 })
    .skip(skip)
    .limit(limit);
};

export const countUserConversationsRepo = async (userId, filter = {}) => {
  return await Conversation.countDocuments({
    participants: userId,
    ...filter,
  });
};

export const createConversationRepo = async (data) => {
  const conversation = await Conversation.create(data);
  return await findConversationByIdRepo(conversation._id);
};

export const updateConversationLastMessageRepo = async (conversationId, messageId, text, senderId) => {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) return null;

  conversation.lastMessage = messageId;
  conversation.lastMessageText = text;
  conversation.lastMessageAt = new Date();

  // Increment unread count for recipient
  const senderStr = senderId.toString();
  const farmerStr = conversation.farmer.toString();

  if (senderStr === farmerStr) {
    conversation.unreadCount.worker += 1;
  } else {
    conversation.unreadCount.farmer += 1;
  }

  await conversation.save();
  return conversation;
};

export const resetUnreadCountRepo = async (conversationId, userRole) => {
  const isFarmer = userRole === 'farmer' || userRole === 'Farmer';
  const fieldToReset = isFarmer ? 'unreadCount.farmer' : 'unreadCount.worker';

  return await Conversation.findByIdAndUpdate(
    conversationId,
    { $set: { [fieldToReset]: 0 } },
    { new: true }
  );
};
