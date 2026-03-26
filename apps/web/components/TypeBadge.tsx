'use client';

import { SlimeType, SLIME_TYPE_LABELS, SLIME_TYPE_COLORS } from '@/lib/types';

interface TypeBadgeProps {
  type: SlimeType;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function TypeBadge({ type, size = 'md', className = '' }: TypeBadgeProps) {
  const { bg, text } = SLIME_TYPE_COLORS[type];
  const label = SLIME_TYPE_LABELS[type];

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 font-semibold',
    md: 'text-xs px-2.5 py-1 font-semibold',
    lg: 'text-sm px-3 py-1.5 font-bold',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full leading-none tracking-wide ${sizeClasses[size]} ${className}`}
      style={{ backgroundColor: bg, color: text }}
    >
      {label}
    </span>
  );
}
