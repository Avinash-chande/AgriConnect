import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
  glass?: boolean;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  hoverEffect = true,
  glass = false,
  onClick
}) => {
  return (
    <div
      onClick={onClick}
      className={`
        rounded-2xl border transition-all duration-300
        ${glass 
          ? 'glass-panel shadow-soft-sm' 
          : 'bg-white border-agri-border shadow-soft-sm hover:shadow-soft-md'
        }
        ${hoverEffect ? 'hover:-translate-y-1 hover:border-emerald-300/80 cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
};
