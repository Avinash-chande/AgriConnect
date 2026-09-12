import React from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: (SelectOption | string)[];
  error?: string;
  leftIcon?: React.ReactNode;
}

export const Select: React.FC<SelectProps> = ({
  label,
  options,
  error,
  leftIcon,
  className = '',
  id,
  ...props
}) => {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full flex flex-col space-y-1.5 text-left">
      {label && (
        <label 
          htmlFor={selectId} 
          className="text-xs font-semibold text-agri-text tracking-wide uppercase"
        >
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        {leftIcon && (
          <div className="absolute left-3.5 pointer-events-none text-agri-muted">
            {leftIcon}
          </div>
        )}

        <select
          id={selectId}
          className={`
            w-full appearance-none rounded-xl border bg-white px-4 py-3 text-sm text-agri-text
            transition-all duration-200 shadow-sm outline-none cursor-pointer pr-10
            ${leftIcon ? 'pl-10' : ''}
            ${error 
              ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-200' 
              : 'border-agri-border hover:border-slate-300 focus:border-agri-primary focus:ring-2 focus:ring-agri-light'
            }
            ${className}
          `}
          {...props}
        >
          {options.map((opt, idx) => {
            const value = typeof opt === 'string' ? opt : opt.value;
            const labelStr = typeof opt === 'string' ? opt : opt.label;
            return (
              <option key={idx} value={value}>
                {labelStr}
              </option>
            );
          })}
        </select>

        <div className="absolute right-3.5 pointer-events-none text-agri-muted">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>

      {error && <p className="text-xs text-rose-500 font-medium">{error}</p>}
    </div>
  );
};
