import React, { useState } from 'react';
import { Eye, EyeOff, XCircle } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  isPassword?: boolean;
  onClear?: () => void;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  isPassword = false,
  onClear,
  className = '',
  id,
  type = 'text',
  value,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className="w-full flex flex-col space-y-1.5 text-left">
      {label && (
        <label 
          htmlFor={inputId} 
          className="text-xs font-semibold text-agri-text tracking-wide uppercase flex items-center justify-between"
        >
          <span>{label}</span>
        </label>
      )}
      
      <div className="relative flex items-center">
        {leftIcon && (
          <div className="absolute left-3.5 pointer-events-none text-agri-muted">
            {leftIcon}
          </div>
        )}

        <input
          id={inputId}
          type={inputType}
          value={value}
          className={`
            w-full rounded-xl border bg-white px-4 py-3 text-sm text-agri-text placeholder-agri-muted/60
            transition-all duration-200 shadow-sm outline-none
            ${leftIcon ? 'pl-10' : ''}
            ${isPassword || onClear ? 'pr-10' : ''}
            ${error 
              ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-200' 
              : 'border-agri-border hover:border-slate-300 focus:border-agri-primary focus:ring-2 focus:ring-agri-light'
            }
            ${className}
          `}
          {...props}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 text-agri-muted hover:text-agri-text focus:outline-none p-1 rounded-md"
            tabIndex={-1}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}

        {!isPassword && onClear && value && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-3 text-agri-muted hover:text-rose-500 focus:outline-none p-1 rounded-md"
            tabIndex={-1}
            aria-label="Clear input"
          >
            <XCircle className="w-4 h-4" />
          </button>
        )}
      </div>

      {error ? (
        <p className="text-xs text-rose-500 font-medium">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-agri-muted">{helperText}</p>
      ) : null}
    </div>
  );
};
