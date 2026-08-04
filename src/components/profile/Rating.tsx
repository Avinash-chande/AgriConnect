import React from 'react';
import { Star } from 'lucide-react';

interface RatingProps {
  rating: number; // 0 to 5
  maxRating?: number;
  totalReviews?: number;
  showValue?: boolean;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onChange?: (newRating: number) => void;
  className?: string;
}

export const Rating: React.FC<RatingProps> = ({
  rating = 4.9,
  maxRating = 5,
  totalReviews,
  showValue = true,
  size = 'md',
  interactive = false,
  onChange,
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <div className={`inline-flex items-center space-x-1.5 ${className}`}>
      <div className="flex items-center space-x-0.5">
        {Array.from({ length: maxRating }).map((_, index) => {
          const starValue = index + 1;
          const isFilled = starValue <= Math.round(rating);

          return (
            <button
              key={index}
              type="button"
              disabled={!interactive}
              onClick={() => interactive && onChange && onChange(starValue)}
              className={`${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-transform`}
            >
              <Star
                className={`
                  ${sizeClasses[size]}
                  ${isFilled
                    ? 'fill-amber-400 text-amber-400'
                    : 'fill-slate-200 text-slate-300'
                  }
                `}
              />
            </button>
          );
        })}
      </div>

      {showValue && (
        <span className="text-xs font-bold font-heading text-slate-800">
          {rating.toFixed(1)}
        </span>
      )}

      {totalReviews !== undefined && (
        <span className="text-xs text-slate-400 font-medium">
          ({totalReviews})
        </span>
      )}
    </div>
  );
};
