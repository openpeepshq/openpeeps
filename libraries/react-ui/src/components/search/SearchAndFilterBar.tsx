import * as React from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

export interface SearchAndFilterBarProps {
  search?: string;
  onSearchChange?: (value: string) => void;
  placeholder?: string;
  onSortClick?: () => void;
  onFilterClick?: () => void;
  className?: string;
  debounceTimeMs?: number;
  hideIcon?: boolean;
  /** Minimum length before the search is propagated. Mirrors the Svelte original. */
  minLength?: number;
}

export function SearchAndFilterBar({
  search = '',
  onSearchChange,
  placeholder = 'Search',
  className,
  debounceTimeMs = 800,
  hideIcon = false,
  minLength = 3,
}: SearchAndFilterBarProps) {
  const [value, setValue] = React.useState(search);

  React.useEffect(() => {
    if (!onSearchChange) return;
    const handle = setTimeout(() => {
      if (value.length < minLength) {
        onSearchChange('');
      } else {
        onSearchChange(value);
      }
    }, debounceTimeMs);
    return () => clearTimeout(handle);
  }, [value, debounceTimeMs, minLength, onSearchChange]);

  return (
    <div className={className}>
      <div className={cn('flex items-center rounded-md border border-surface-400')}>
        {!hideIcon && (
          <button
            type="button"
            className="flex items-center justify-center rounded-l-md px-2 py-1"
            tabIndex={-1}
            aria-hidden="true"
          >
            <Search />
          </button>
        )}
        <Input
          placeholder={placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-10 flex-grow border-0 bg-inherit px-2 py-1 outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
        />
      </div>
    </div>
  );
}
