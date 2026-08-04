import React from 'react';
import { FolderOpen, Plus } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  message?: string;
  actionText?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No Records Found',
  message = 'There are currently no items or images available to display in this category.',
  actionText,
  onAction,
  icon,
}) => {
  return (
    <div className="bg-slate-50/60 rounded-3xl border-2 border-dashed border-slate-200 p-8 sm:p-12 text-center max-w-md mx-auto my-6 space-y-4">
      <div className="w-14 h-14 rounded-2xl bg-white text-slate-400 mx-auto flex items-center justify-center border border-slate-200 shadow-sm">
        {icon || <FolderOpen className="w-7 h-7" />}
      </div>

      <div className="space-y-1">
        <h4 className="text-base font-bold font-heading text-slate-800">{title}</h4>
        <p className="text-xs text-slate-500 leading-relaxed">{message}</p>
      </div>

      {actionText && onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 rounded-xl bg-agri-primary text-white font-bold font-heading text-xs hover:bg-agri-hover transition-colors shadow-sm inline-flex items-center space-x-1.5 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{actionText}</span>
        </button>
      )}
    </div>
  );
};
