import React from 'react';
import { cn } from '@/lib/utils';

export function Avatar({ src, name, size = 'md', className }) {
  const [imgError, setImgError] = React.useState(false);

  const sizes = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base font-semibold',
    xl: 'w-16 h-16 text-lg font-bold',
  };

  const getInitials = (n) => {
    if (!n) return '?';
    return n
      .split(' ')
      .map(part => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <div
      className={cn(
        'relative inline-flex items-center justify-center rounded-full overflow-hidden shrink-0 select-none bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-medium border border-slate-200 dark:border-slate-800',
        sizes[size],
        className
      )}
    >
      {src && !imgError ? (
        <img
          src={src}
          alt={name || 'Avatar'}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <span>{getInitials(name)}</span>
      )}
    </div>
  );
}
