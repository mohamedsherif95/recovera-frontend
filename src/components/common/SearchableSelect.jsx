import { useState, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { includesNormalizedText } from '@/lib/search';

/**
 * Simple searchable select using Radix Select and a text filter.
 * options: [{ value: string, label: string }]
 */
export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder,
  disabled,
}) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search) return options;
    return options.filter((opt) => includesNormalizedText(opt.label, search));
  }, [options, search]);

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <div className="px-2 pb-1" onKeyDown={(e) => e.stopPropagation()}>
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={placeholder}
            className="h-8 text-xs"
            onKeyDown={(e) => e.stopPropagation()}
          />
        </div>
        {filtered.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
