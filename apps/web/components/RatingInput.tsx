'use client';

import { useState } from 'react';

interface RatingInputProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
  emoji: string;
  description?: string;
  disabled?: boolean;
}

export function RatingInput({
  value,
  onChange,
  label,
  emoji,
  description,
  disabled = false,
}: RatingInputProps) {
  const [hovered, setHovered] = useState(0);

  const display = hovered || value;

  return (
    <div className="flex items-center justify-between py-3 border-b border-pink-50 last:border-0">
      <div className="flex flex-col gap-0.5 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-base leading-none">{emoji}</span>
          <span className="text-sm font-semibold text-gray-800">{label}</span>
        </div>
        {description && (
          <span className="text-xs text-gray-400 pl-6">{description}</span>
        )}
      </div>

      <div
        className="flex items-center gap-1 shrink-0"
        onMouseLeave={() => !disabled && setHovered(0)}
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={disabled}
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-all active:scale-90 ${
              disabled ? 'cursor-default' : 'cursor-pointer hover:scale-110'
            }`}
            onMouseEnter={() => !disabled && setHovered(star)}
            onClick={() => !disabled && onChange(star)}
            aria-label={`Rate ${star} out of 5`}
          >
            <svg
              viewBox="0 0 24 24"
              className="w-6 h-6 transition-colors"
              fill={star <= display ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth={star <= display ? 0 : 1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
              />
            </svg>
          </button>
        ))}

        <span className="w-8 text-right text-sm font-bold text-pink-500 tabular-nums">
          {value > 0 ? value.toFixed(0) : '–'}
        </span>
      </div>
    </div>
  );
}

// ─── Display-only version (read mode) ─────────────────────────────────────────

interface RatingDisplayProps {
  value: number | null;
  size?: 'sm' | 'md';
  showEmpty?: boolean;
}

export function RatingDisplay({ value, size = 'md', showEmpty = false }: RatingDisplayProps) {
  if (value === null && !showEmpty) return null;

  const stars = value ?? 0;
  const starSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          viewBox="0 0 24 24"
          className={`${starSize} transition-colors`}
          fill={star <= stars ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth={star <= stars ? 0 : 1.5}
          style={{ color: star <= stars ? '#f472b6' : '#e5e7eb' }}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
          />
        </svg>
      ))}
      {value !== null && (
        <span className={`ml-1 font-bold tabular-nums ${size === 'sm' ? 'text-xs' : 'text-sm'} text-gray-600`}>
          {value.toFixed(1)}
        </span>
      )}
    </div>
  );
}
