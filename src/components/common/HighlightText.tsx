import React from 'react';

interface HighlightTextProps {
  text: string;
  highlight?: string;
  query?: string;
  className?: string;
}

export const HighlightText: React.FC<HighlightTextProps> = ({
  text,
  highlight,
  query: queryAlias,
  className = '',
}) => {
  const activeQuery = (highlight || queryAlias || '').trim();
  if (!text) return null;
  if (!activeQuery) {
    return <span className={className}>{text}</span>;
  }

  const escapedQuery = activeQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedQuery})`, 'gi');
  const parts = text.split(regex);

  return (
    <span className={className}>
      {parts.map((part, index) =>
        regex.test(part) ? (
          <mark
            key={index}
            className="bg-emerald-400/30 text-emerald-300 font-bold px-0.5 rounded shadow-sm border border-emerald-500/20"
          >
            {part}
          </mark>
        ) : (
          <React.Fragment key={index}>{part}</React.Fragment>
        )
      )}
    </span>
  );
};
