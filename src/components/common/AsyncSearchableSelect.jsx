import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/useDebounce';

function mergeUniqueOptions(options) {
  const map = new Map();
  options.forEach((option) => {
    if (!option || !option.value) return;
    if (!map.has(option.value)) {
      map.set(option.value, option);
    }
  });
  return Array.from(map.values());
}

export function AsyncSearchableSelect({
  options = [],
  value,
  onChange,
  placeholder,
  disabled,
  searchPlaceholder,
  onSearchChange,
  debounceMs = 300,
  hasMore = false,
  onLoadMore,
  isLoading = false,
  isLoadingMore = false,
  isError = false,
  selectedOption,
  emptyText = 'No results found',
  loadingText = 'Loading...',
  loadMoreText = 'Load more',
  errorText = 'Failed to load options',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, debounceMs);
  const viewportRef = useRef(null);

  useEffect(() => {
    if (!onSearchChange) return;
    onSearchChange(debouncedSearch);
  }, [debouncedSearch, onSearchChange]);

  const mergedOptions = useMemo(() => {
    const base = [...options];

    if (value && !base.some((opt) => String(opt.value) === String(value))) {
      base.unshift(
        selectedOption || {
          value: String(value),
          label: String(value),
        },
      );
    }

    return mergeUniqueOptions(base);
  }, [options, value, selectedOption]);

  const handleViewportScroll = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport || !hasMore || isLoadingMore || isLoading || !onLoadMore) return;

    const distanceFromBottom =
      viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
    if (distanceFromBottom <= 32) {
      onLoadMore();
    }
  }, [hasMore, isLoadingMore, isLoading, onLoadMore]);

  const handleOpenChange = (nextOpen) => {
    setIsOpen(nextOpen);

    if (!nextOpen) {
      setSearch('');
      if (onSearchChange) {
        onSearchChange('');
      }
    }
  };

  return (
    <Select
      value={value}
      onValueChange={onChange}
      disabled={disabled}
      open={isOpen}
      onOpenChange={handleOpenChange}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent viewportRef={viewportRef} onViewportScroll={handleViewportScroll}>
        <div className="px-2 pb-1" onKeyDown={(event) => event.stopPropagation()}>
          <Input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={searchPlaceholder || placeholder}
            className="h-8 text-xs"
            onKeyDown={(event) => event.stopPropagation()}
          />
        </div>

        {isError && (
          <div className="px-2 py-2 text-xs text-destructive">{errorText}</div>
        )}

        {!isError &&
          mergedOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}

        {!isError && !isLoading && mergedOptions.length === 0 && (
          <div className="px-2 py-2 text-xs text-muted-foreground">{emptyText}</div>
        )}

        {isLoading && (
          <div className="px-2 py-2 text-xs text-muted-foreground">{loadingText}</div>
        )}

        {!isError && hasMore && onLoadMore && (
          <div className="px-2 py-1">
            <button
              type="button"
              className="w-full rounded-sm border px-2 py-1 text-xs hover:bg-accent disabled:opacity-60"
              disabled={isLoadingMore}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onLoadMore();
              }}
            >
              {isLoadingMore ? loadingText : loadMoreText}
            </button>
          </div>
        )}
      </SelectContent>
    </Select>
  );
}
