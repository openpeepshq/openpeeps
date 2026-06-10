import { useRef, useMemo, useState } from 'react';
import type { PublicProfile } from '@openpeeps/common/types';
import { Textarea } from '@openpeeps/react-ui';
import { useOpenpeeps } from '../../../contexts/openpeeps';
import { ProfileCard } from '../../profile';

export interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  testId?: string;
}

export function MentionTextarea({
  value,
  onChange,
  rows = 5,
  placeholder,
  testId,
}: MentionTextareaProps) {
  const { openpeepsApi } = useOpenpeeps();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const profilesQuery = openpeepsApi.useSearchProfiles(query);

  const profiles = useMemo(
    () =>
      (profilesQuery.data?.pages ?? [])
        .flat()
        .map((item) => item.data)
        .slice(0, 6),
    [profilesQuery.data],
  );

  const handleChange = (next: string) => {
    onChange(next);
    const el = textareaRef.current;
    if (!el) return;
    const cursor = el.selectionStart ?? next.length;
    const before = next.slice(0, cursor);
    const match = before.match(/@([a-zA-Z0-9_-]*)$/);
    if (match) {
      setQuery(match[1] ?? '');
      setOpen(true);
    } else {
      setOpen(false);
      setQuery('');
    }
  };

  const insertMention = (profile: PublicProfile) => {
    const el = textareaRef.current;
    if (!el) return;
    const cursor = el.selectionStart ?? value.length;
    const before = value.slice(0, cursor);
    const after = value.slice(cursor);
    const replaced = before.replace(/@([a-zA-Z0-9_-]*)$/, `@${profile.handle} `);
    const next = `${replaced}${after}`;
    onChange(next);
    setOpen(false);
    setQuery('');
  };

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => handleChange(e.target.value)}
        data-testid={testId}
      />
      {open && query.length >= 1 && profiles.length > 0 ? (
        <div className="bg-card absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-md border shadow-md">
          {profiles.map((profile) => (
            <button
              key={profile.id}
              type="button"
              className="hover:bg-surface-100 w-full text-left"
              onMouseDown={(e) => {
                e.preventDefault();
                insertMention(profile);
              }}
            >
              <ProfileCard profile={profile} showAction={false} />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
