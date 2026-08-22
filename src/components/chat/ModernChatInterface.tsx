import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Search,
  Check,
  CheckCheck,
  Edit2,
  Trash2,
  Briefcase,
  X,
  ShieldCheck,
  Smile,
  Paperclip,
  ChevronDown,
  PhoneCall,
} from 'lucide-react';
import type { ConversationData, ChatMessage, UploadedAttachmentResponse } from '../../services/chatService';
import { uploadChatAttachment } from '../../services/chatService';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../hooks/useSocket';
import {
  useConversationMessages,
  useSendMessage,
  useEditMessage,
  useDeleteMessage,
  useMarkConversationRead,
} from '../../hooks/useChatQuery';
import { useTypingIndicator } from '../../hooks/useTypingIndicator';
import { EmojiPickerPopover } from './EmojiPickerPopover';
import { ImageLightboxModal } from './ImageLightboxModal';
import { ChatSkeleton } from './ChatSkeleton';
import { OnlineIndicator } from '../common/OnlineIndicator';
import { FileAttachmentPreview } from './FileAttachmentPreview';
import { HighlightText } from '../common/HighlightText';

interface ModernChatInterfaceProps {
  conversation: ConversationData;
}

/**
 * Format Date Separator Badge Text
 */
const formatDateSeparator = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();

  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) return 'Today';
  if (isYesterday) return 'Yesterday';

  return date.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
};

/**
 * Helper to Group Messages by Date
 */
interface GroupedMessages {
  dateLabel: string;
  messages: ChatMessage[];
}

const groupMessagesByDate = (messages: ChatMessage[]): GroupedMessages[] => {
  const groups: { [key: string]: ChatMessage[] } = {};

  messages.forEach((msg) => {
    const label = formatDateSeparator(msg.createdAt);
    if (!groups[label]) {
      groups[label] = [];
    }
    groups[label].push(msg);
  });

  return Object.keys(groups).map((dateLabel) => ({
    dateLabel,
    messages: groups[dateLabel],
  }));
};

export const ModernChatInterface: React.FC<ModernChatInterfaceProps> = ({ conversation }) => {
  const { user } = useAuth();
  const { onlineUserIds } = useSocket();

  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<UploadedAttachmentResponse | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [activeLightboxImage, setActiveLightboxImage] = useState<string | null>(null);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentUserId = user?._id || '';
  const userRole = (user?.role || '').toLowerCase();

  const partner = userRole === 'farmer' ? conversation.worker : conversation.farmer;
  const isOnline = partner?._id
    ? onlineUserIds.includes(String(partner._id))
    : false;

  // React Query Hooks
  const { data, isLoading } = useConversationMessages(conversation._id, {
    search: searchQuery,
  });

  const sendMessageMutation = useSendMessage();
  const editMessageMutation = useEditMessage();
  const deleteMessageMutation = useDeleteMessage();
  const markReadMutation = useMarkConversationRead();

  const messages: ChatMessage[] = data?.messages || [];
  const groupedMessages = groupMessagesByDate(messages);

  // Auto Scroll to Bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages.length]);

  // Handle scroll detection for "Scroll to bottom" floating button
  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const isFarFromBottom = scrollHeight - scrollTop - clientHeight > 150;
    setShowScrollBottomBtn(isFarFromBottom);
  };

  // Mark Read on mount or active conversation change
  useEffect(() => {
    if (conversation._id) {
      markReadMutation.mutate(conversation._id);
    }
  }, [conversation._id]);

  const partnerId = partner?._id || null;
  const { handleKeystroke, stopTyping, activeTypingState } = useTypingIndicator(
    conversation._id,
    partnerId
  );

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() && !pendingAttachment) return;

    const textToSend = messageText.trim();
    const attachments = pendingAttachment
      ? [
        {
          url: pendingAttachment.url,
          fileType: pendingAttachment.fileType,
          fileName: pendingAttachment.fileName,
          fileSize: pendingAttachment.fileSize,
        },
      ]
      : [];

    setMessageText('');
    setPendingAttachment(null);
    setShowEmojiPicker(false);
    stopTyping();

    sendMessageMutation.mutate({
      conversationId: conversation._id,
      text: textToSend || (pendingAttachment ? `Sent attachment: ${pendingAttachment.fileName}` : 'Sent attachment'),
      attachments,
    });
  };

  const handleSelectEmoji = (emoji: string) => {
    setMessageText((prev) => prev + emoji);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate 10MB file limit
    if (file.size > 10 * 1024 * 1024) {
      alert('File size exceeds the 10MB limit. Please select a smaller file.');
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);
      const uploaded = await uploadChatAttachment(file, (percent) => {
        setUploadProgress(percent);
      });
      setPendingAttachment(uploaded);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to upload attachment.');
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleStartEdit = (msg: ChatMessage) => {
    setEditingMessageId(msg._id);
    setEditText(msg.text);
  };

  const handleSaveEdit = (msgId: string) => {
    if (!editText.trim()) return;
    editMessageMutation.mutate({ messageId: msgId, text: editText.trim() });
    setEditingMessageId(null);
    setEditText('');
  };

  const handleDelete = (msgId: string) => {
    if (window.confirm('Are you sure you want to delete this message?')) {
      deleteMessageMutation.mutate(msgId);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 relative overflow-hidden font-sans">
      {/* WhatsApp Wallpaper Style Background Pattern Overlay */}
      <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

      {/* Top Navigation Header */}
      <div className="p-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between z-10 shadow-md">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-600/30 to-teal-800/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-sm shadow-inner">
              {partner?.name ? partner.name.charAt(0).toUpperCase() : 'U'}
            </div>
            {isOnline ? (
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full shadow-md" />
            ) : (
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-slate-600 border-2 border-slate-900 rounded-full opacity-60" />
            )}
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-bold text-white tracking-tight">{partner?.name || 'User'}</h3>
              <span className="text-[10px] font-semibold uppercase px-2 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                {partner?.role || 'Member'}
              </span>
            </div>
            <div className="text-[11px] text-emerald-400 font-medium flex items-center mt-0.5">
              <Briefcase className="w-3 h-3 mr-1 inline flex-shrink-0" />
              <span className="truncate max-w-[200px]">{conversation.job?.title || 'Job Vacancy'}</span>
              <OnlineIndicator
                userId={partner?._id ? String(partner._id) : ''}
                isOnlineOverride={isOnline}
                className="ml-2"
              />
            </div>
          </div>
        </div>

        {/* Right Header Action Tools */}
        <div className="flex items-center space-x-2">
          {partner?.mobile && (
            <a
              href={`tel:${partner.mobile}`}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-emerald-400 transition-colors"
              title="Call Candidate"
            >
              <PhoneCall className="w-4 h-4" />
            </a>
          )}

          {/* Search Message */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search chat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-32 sm:w-44 bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Verified Notice Banner */}
      <div className="bg-emerald-950/30 border-b border-emerald-500/20 px-4 py-1.5 flex items-center justify-between text-[11px] text-emerald-300 z-10">
        <div className="flex items-center space-x-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
          <span>Application matched: <strong>{conversation.job?.title}</strong></span>
        </div>
      </div>

      {/* Messages Thread Scroll Area */}
      <div
        ref={chatContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-4 z-10"
      >
        {isLoading ? (
          <ChatSkeleton />
        ) : groupedMessages.length === 0 ? (
          <div className="text-center text-xs text-slate-500 py-16 flex flex-col items-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-2">
              <Smile className="w-6 h-6 text-slate-500" />
            </div>
            <p className="font-semibold text-slate-300">No messages yet</p>
            <p className="text-[11px] text-slate-500 mt-1">Send a friendly greeting to start the conversation!</p>
          </div>
        ) : (
          groupedMessages.map((group, groupIdx) => (
            <React.Fragment key={groupIdx}>
              {/* Centered Date Separator Badge */}
              <div className="flex justify-center my-3">
                <span className="bg-slate-900/90 border border-slate-800 text-slate-400 text-[10px] font-bold px-3 py-1 rounded-full shadow-md">
                  {group.dateLabel}
                </span>
              </div>

              {/* Message Bubbles */}
              {group.messages.map((msg) => {
                const isMe = (msg.sender?._id || msg.sender).toString() === currentUserId;
                const isEditingThis = editingMessageId === msg._id;

                return (
                  <motion.div
                    key={msg._id}
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.15 }}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[80%] sm:max-w-[70%] rounded-2xl p-3 text-xs shadow-lg relative group ${isMe
                        ? 'bg-emerald-700 text-white rounded-br-none border border-emerald-600/50'
                        : 'bg-slate-900 border border-slate-800 text-slate-100 rounded-bl-none'
                        } ${msg.isDeleted ? 'opacity-60 italic bg-slate-900 border-slate-800 text-slate-400' : ''}`}
                    >
                      {/* File / Image / PDF Attachment Preview */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <FileAttachmentPreview
                          attachments={msg.attachments}
                          onImageClick={(url) => setActiveLightboxImage(url)}
                        />
                      )}

                      {/* Inline Message Edit Form */}
                      {isEditingThis ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs text-white focus:outline-none"
                          />
                          <div className="flex space-x-2 justify-end">
                            <button
                              onClick={() => setEditingMessageId(null)}
                              className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleSaveEdit(msg._id)}
                              className="text-[10px] px-2 py-0.5 rounded bg-emerald-400 text-slate-950 font-bold"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <HighlightText text={msg.text} highlight={searchQuery} className="leading-relaxed whitespace-pre-wrap" />
                          {msg.isEdited && !msg.isDeleted && (
                            <span className="text-[9px] opacity-70 ml-1 italic">(edited)</span>
                          )}
                        </>
                      )}

                      {/* Sender Hover Controls */}
                      {isMe && !msg.isDeleted && !isEditingThis && (
                        <div className="absolute -top-3 right-2 hidden group-hover:flex items-center space-x-1 bg-slate-900 border border-slate-700 rounded-full px-2 py-0.5 shadow-xl z-20">
                          <button
                            onClick={() => handleStartEdit(msg)}
                            className="text-slate-400 hover:text-emerald-400 p-0.5"
                            title="Edit message"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDelete(msg._id)}
                            className="text-slate-400 hover:text-rose-400 p-0.5"
                            title="Delete message"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}

                      {/* Timestamp & Double Check Read Receipts */}
                      <div className="flex items-center justify-end space-x-1 mt-1 text-[10px] text-slate-300/80">
                        <span>
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {isMe && !msg.isDeleted && (
                          msg.status === 'seen' || msg.isRead ? (
                            <span title={msg.readAt ? `Seen at ${new Date(msg.readAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Seen'}>
                              <CheckCheck className="w-3.5 h-3.5 text-cyan-300 inline drop-shadow-[0_0_4px_rgba(6,182,212,0.6)]" />
                            </span>
                          ) : msg.status === 'delivered' ? (
                            <span title={msg.deliveredAt ? `Delivered at ${new Date(msg.deliveredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Delivered'}>
                              <CheckCheck className="w-3.5 h-3.5 text-slate-300 inline opacity-80" />
                            </span>
                          ) : (
                            <span title="Sent">
                              <Check className="w-3.5 h-3.5 text-slate-400 inline opacity-60" />
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </React.Fragment>
          ))
        )}

        {/* Live Typing Indicator */}
        {activeTypingState.isTyping && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="flex items-center space-x-2 text-xs text-emerald-400 font-medium italic bg-slate-900/80 border border-slate-800 w-fit px-3 py-1.5 rounded-full shadow-lg"
          >
            <span className="flex space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
            <span>{activeTypingState.label || `${partner?.name || 'User'} is typing...`}</span>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Floating Scroll to Bottom Button */}
      {showScrollBottomBtn && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-20 right-6 z-20 p-2.5 rounded-full bg-emerald-500 text-slate-950 font-bold shadow-xl hover:bg-emerald-400 transition-transform hover:scale-110"
          title="Scroll to latest messages"
        >
          <ChevronDown className="w-5 h-5" />
        </button>
      )}

      {/* Upload Progress Bar */}
      {isUploading && uploadProgress !== null && (
        <div className="p-3 bg-slate-900 border-t border-slate-800 z-20 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-emerald-400 font-bold">
            <span>Uploading file attachment...</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${uploadProgress}%` }}
              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full"
            />
          </div>
        </div>
      )}

      {/* Selected File Attachment Preview Bar */}
      {pendingAttachment && !isUploading && (
        <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between z-20 shadow-md">
          <div className="flex items-center space-x-3">
            {pendingAttachment.fileType === 'image' ? (
              <img
                src={pendingAttachment.url}
                alt="Attachment preview"
                className="w-10 h-10 rounded-xl object-cover border border-emerald-500/50"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-500/50 flex items-center justify-center text-emerald-400 font-bold text-xs">
                {pendingAttachment.fileType.toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-xs font-bold text-slate-200 truncate max-w-[220px]">
                {pendingAttachment.fileName}
              </p>
              <p className="text-[10px] text-emerald-400 font-medium">Ready to send attachment</p>
            </div>
          </div>
          <button
            onClick={() => setPendingAttachment(null)}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
            title="Remove attachment"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Popover Emoji Picker */}
      <AnimatePresence>
        {showEmojiPicker && (
          <EmojiPickerPopover
            onSelectEmoji={handleSelectEmoji}
            onClose={() => setShowEmojiPicker(false)}
          />
        )}
      </AnimatePresence>

      {/* Hidden File Input for Image, PDF, and Document Uploads */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*,.pdf,.doc,.docx,.txt"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Input Toolbar */}
      <form
        onSubmit={handleSend}
        className="p-3 bg-slate-900 border-t border-slate-800 flex items-center space-x-2 z-20"
      >
        {/* Emoji Button */}
        <button
          type="button"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className={`p-2 rounded-xl transition-colors ${showEmojiPicker ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          title="Emoji picker"
        >
          <Smile className="w-5 h-5" />
        </button>

        {/* Image Attachment Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Attach image"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        {/* Text Input */}
        <input
          type="text"
          placeholder={`Type message to ${partner?.name || 'user'}...`}
          value={messageText}
          onChange={(e) => {
            setMessageText(e.target.value);
            if (e.target.value.trim().length > 0) {
              handleKeystroke();
            } else {
              stopTyping();
            }
          }}
          onBlur={stopTyping}
          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
        />

        {/* Send Button */}
        <button
          type="submit"
          disabled={(!messageText.trim() && !pendingAttachment) || sendMessageMutation.isPending || isUploading}
          className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold p-2.5 rounded-xl transition-all shadow-lg flex items-center justify-center flex-shrink-0"
          title="Send Message"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

      {/* Image Lightbox Modal */}
      <ImageLightboxModal
        imageUrl={activeLightboxImage}
        onClose={() => setActiveLightboxImage(null)}
      />
    </div>
  );
};
