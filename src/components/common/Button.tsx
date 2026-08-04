import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 rounded-xl select-none active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 shadow-sm';
  
  const variants = {
    primary: 'bg-agri-primary hover:bg-agri-hover text-white focus:ring-agri-primary shadow-agri-primary/20 hover:shadow-agri-glow',
    secondary: 'bg-agri-light text-agri-dark hover:bg-emerald-200 focus:ring-agri-primary border border-emerald-200/60',
    outline: 'bg-white text-agri-text border border-agri-border hover:bg-slate-50 hover:border-slate-300 focus:ring-agri-primary',
    ghost: 'bg-transparent text-agri-text hover:bg-slate-100 shadow-none focus:ring-agri-primary',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500',
    dark: 'bg-agri-dark text-white hover:bg-agri-deep focus:ring-agri-dark shadow-agri-dark/30'
  };

  const sizes = {
    sm: 'text-xs px-3.5 py-2 space-x-1.5 rounded-lg font-semibold',
    md: 'text-sm px-5 py-2.5 space-x-2 font-semibold',
    lg: 'text-base px-6 py-3.5 space-x-2.5 font-bold rounded-2xl'
  };

  return (
    <button
      className={`
        ${baseStyles}
        ${variants[variant]}
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" />
      ) : (
        leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!isLoading && rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
    </button>
  );
};
