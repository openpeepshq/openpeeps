import { useState } from 'react';
import { Users } from 'lucide-react';
import type { PublicProfile } from '@openpeeps/common/types';
import { useT } from '../../i18n';
import { ProfileBadge } from './ProfileBadge';
import {
  ProfileSelector,
  type ProfileSelectorMode,
  type ProfileSelectorProps,
} from './ProfileSelector';

export type ProfilesInputProps = {
  value: PublicProfile[];
  onChange: (profiles: PublicProfile[]) => void;
  mode?: ProfileSelectorMode;
  placeholder?: string;
  filter?: ProfileSelectorProps['filter'];
  allowlist?: ProfileSelectorProps['allowlist'];
  banlist?: ProfileSelectorProps['banlist'];
  disabled?: boolean;
  className?: string;
  title?: string;
};

export const ProfilesInput = ({
  value,
  onChange,
  mode = 'multiple',
  placeholder,
  filter,
  allowlist,
  banlist,
  disabled = false,
  className,
  title,
}: ProfilesInputProps) => {
  const t = useT();
  const [open, setOpen] = useState(false);

  const removeProfile = (profileId: string) => {
    onChange(value.filter((profile) => profile.id !== profileId));
  };

  return (
    <>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        className={`border-surface-300 bg-surface-200 flex max-h-40 min-h-10 w-full flex-wrap content-start items-center gap-1 overflow-y-auto rounded-lg border px-3 py-1.5 text-left ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${className ?? ''}`}
        onClick={() => {
          if (!disabled) setOpen(true);
        }}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        {value.length === 0 ? (
          <span className="text-muted-foreground flex items-center gap-2 text-sm">
            <Users className="size-4 shrink-0" />
            {placeholder ??
              t('profile.input.placeholder', {
                defaultValue: 'Select profiles',
              })}
          </span>
        ) : (
          value.map((profile) => (
            <ProfileBadge
              key={profile.id}
              profile={profile}
              onRemove={
                disabled
                  ? undefined
                  : () => {
                      removeProfile(profile.id);
                    }
              }
            />
          ))
        )}
      </div>

      <ProfileSelector
        open={open}
        onOpenChange={setOpen}
        mode={mode}
        selectedProfiles={value}
        onConfirm={onChange}
        filter={filter}
        allowlist={allowlist}
        banlist={banlist}
        title={title}
      />
    </>
  );
};
