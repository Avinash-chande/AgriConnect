import React from 'react';
import { FileText, Download, ExternalLink, Image as ImageIcon } from 'lucide-react';

export interface AttachmentItem {
  url: string;
  fileType?: string;
  fileName?: string;
  fileSize?: number;
}

interface FileAttachmentPreviewProps {
  attachments: AttachmentItem[];
  onImageClick?: (url: string) => void;
}

const formatBytes = (bytes?: number): string => {
  if (!bytes) return '';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

export const FileAttachmentPreview: React.FC<FileAttachmentPreviewProps> = ({
  attachments,
  onImageClick,
}) => {
  if (!attachments || attachments.length === 0) return null;

  return (
    <div className="space-y-2 mb-2">
      {attachments.map((att, idx) => {
        const isImage =
          att.fileType === 'image' ||
          /\.(jpg|jpeg|png|webp|gif)$/i.test(att.url) ||
          /\.(jpg|jpeg|png|webp|gif)$/i.test(att.fileName || '');

        const isPdf =
          att.fileType === 'pdf' ||
          /\.pdf$/i.test(att.url) ||
          /\.pdf$/i.test(att.fileName || '');

        if (isImage) {
          return (
            <div key={idx} className="relative group rounded-xl overflow-hidden border border-slate-700/50 shadow-md">
              <img
                src={att.url}
                alt={att.fileName || 'Attachment'}
                onClick={() => onImageClick && onImageClick(att.url)}
                className="max-h-56 w-full object-cover cursor-pointer hover:scale-105 transition-transform duration-200"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2 pointer-events-none">
                <span className="p-2 rounded-full bg-slate-900/80 text-white text-xs font-semibold flex items-center">
                  <ImageIcon className="w-4 h-4 mr-1" /> View Image
                </span>
              </div>
            </div>
          );
        }

        // PDF or Document Attachment Badge
        return (
          <div
            key={idx}
            className="flex items-center justify-between p-3 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-colors space-x-3 shadow-md"
          >
            <div className="flex items-center space-x-3 min-w-0">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow-inner ${
                  isPdf
                    ? 'bg-rose-950/80 border border-rose-800/60 text-rose-400'
                    : 'bg-blue-950/80 border border-blue-800/60 text-blue-400'
                }`}
              >
                {isPdf ? (
                  <FileText className="w-5 h-5 text-rose-400" />
                ) : (
                  <FileText className="w-5 h-5 text-blue-400" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-200 truncate">
                  {att.fileName || (isPdf ? 'Document.pdf' : 'Attachment')}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {isPdf ? 'PDF Document' : 'File Attachment'}
                  {att.fileSize ? ` • ${formatBytes(att.fileSize)}` : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1 shrink-0">
              <a
                href={att.url}
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                title="Open Document"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <a
                href={att.url}
                download={att.fileName || 'attachment'}
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 transition-colors"
                title="Download Attachment"
              >
                <Download className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        );
      })}
    </div>
  );
};
