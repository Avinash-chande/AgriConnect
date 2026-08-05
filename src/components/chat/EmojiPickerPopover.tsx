import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Smile, Heart, ThumbsUp, Flame, Sparkles, X } from 'lucide-react';

interface EmojiPickerPopoverProps {
  onSelectEmoji: (emoji: string) => void;
  onClose: () => void;
}

const EMOJI_CATEGORIES = [
  {
    id: 'frequent',
    name: 'Quick',
    icon: Sparkles,
    emojis: ['👍', '❤️', '😂', '🌾', '🚜', '🙏', '🎉', '🔥', '👏', '🤝', '😊', '✅'],
  },
  {
    id: 'smileys',
    name: 'Smileys',
    icon: Smile,
    emojis: [
      '😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌',
      '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗',
      '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '😮',
    ],
  },
  {
    id: 'agri',
    name: 'Farming',
    icon: Flame,
    emojis: [
      '🌾', '🚜', '🌱', '🌽', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐',
      '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒',
      '🌶️', '🫑', '🌽', '🥕', '🫒', '🧄', '🧅', '🥔', '🍠', '🥐', '🍞', '🪵', '🏡',
    ],
  },
  {
    id: 'gestures',
    name: 'Gestures',
    icon: ThumbsUp,
    emojis: [
      '👍', '👎', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆',
      '🖕', '👇', '☝️', '🖐️', '✋', '🤚', '👋', '👏', '🙌', '👐', '🤲', '🤝', '🙏',
    ],
  },
  {
    id: 'symbols',
    name: 'Symbols',
    icon: Heart,
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞',
      '💓', '💗', '💖', '💘', '💝', '✨', '🌟', '⭐', '💥', '🔥', '🎉', '🎊', '🏆',
    ],
  },
];

export const EmojiPickerPopover: React.FC<EmojiPickerPopoverProps> = ({
  onSelectEmoji,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<string>('frequent');

  const currentCategory = EMOJI_CATEGORIES.find((c) => c.id === activeTab) || EMOJI_CATEGORIES[0];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 10 }}
      className="absolute bottom-16 left-4 z-50 w-72 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
    >
      {/* Popover Header */}
      <div className="p-2.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
        <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider px-1">
          Select Emoji
        </span>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Category Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-950/40">
        {EMOJI_CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = cat.id === activeTab;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveTab(cat.id)}
              className={`flex-1 py-2 flex items-center justify-center text-xs transition-colors ${
                isActive
                  ? 'text-emerald-400 border-b-2 border-emerald-400 bg-emerald-950/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title={cat.name}
            >
              <Icon className="w-3.5 h-3.5" />
            </button>
          );
        })}
      </div>

      {/* Emoji Grid */}
      <div className="p-3 max-h-48 overflow-y-auto grid grid-cols-6 gap-1 bg-slate-900/90">
        {currentCategory.emojis.map((emoji, index) => (
          <button
            key={index}
            onClick={() => {
              onSelectEmoji(emoji);
            }}
            className="w-9 h-9 text-lg rounded-xl hover:bg-slate-800 flex items-center justify-center transition-transform hover:scale-125"
          >
            {emoji}
          </button>
        ))}
      </div>
    </motion.div>
  );
};
