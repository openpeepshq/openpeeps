import { useEffect, useMemo, useState } from 'react';
import { Check, Search } from 'lucide-react';
import type { PublicProfile } from '@openpeepshq/common/types';
import {
  matchesQuery,
  profileName,
  sortProfiles,
} from '@openpeepshq/common/lib';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
} from '@openpeepshq/react-ui';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useT } from '../../i18n';
import { Avatar } from './Avatar';
import { ProfileBadge } from './ProfileBadge';

export type ProfileSelectorMode = 'single' | 'multiple';

export type ProfileSelectorProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: ProfileSelectorMode;
  selectedProfiles: PublicProfile[];
  onConfirm: (profiles: PublicProfile[]) => void | Promise<void>;
  filter?: (profile: PublicProfile) => boolean;
  allowlist?: PublicProfile[];
  banlist?: PublicProfile[] | string[];
  title?: string;
};

const banlistIds = (banlist?: PublicProfile[] | string[]): Set<string> => {
  if (!banlist?.length) return new Set();
  return new Set(
    banlist.map((entry) => (typeof entry === 'string' ? entry : entry.id)),
  );
};

const dialogContentClassName =
  'flex max-h-[85vh] max-w-lg flex-col overflow-hidden max-sm:inset-0 max-sm:h-dvh max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none max-sm:max-h-none';

export const ProfileSelector = ({
  open,
  onOpenChange,
  mode,
  selectedProfiles,
  onConfirm,
  filter,
  allowlist,
  banlist,
  title,
}: ProfileSelectorProps) => {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const profilesQuery = openpeepsApi.useProfiles();
  const [searchString, setSearchString] = useState('');
  const [draft, setDraft] = useState<PublicProfile[]>(selectedProfiles);

  useEffect(() => {
    if (!open) return;
    setDraft(selectedProfiles);
    setSearchString('');
  }, [open, selectedProfiles]);

  const banned = useMemo(() => banlistIds(banlist), [banlist]);

  const selectableProfiles = useMemo(() => {
    const source = allowlist ?? profilesQuery.data ?? [];
    return sortProfiles(
      source
        .filter((profile) => !banned.has(profile.id))
        .filter((profile) => !filter || filter(profile))
        .filter(
          (profile) => !searchString || matchesQuery(profile, searchString),
        ),
    );
  }, [allowlist, profilesQuery.data, banned, filter, searchString]);

  const isSelected = (profileId: string) =>
    draft.some((profile) => profile.id === profileId);

  const toggleProfile = (profile: PublicProfile) => {
    if (mode === 'single') {
      void Promise.resolve(onConfirm([profile])).then(() => {
        onOpenChange(false);
      });
      return;
    }
    setDraft((prev) =>
      prev.some((p) => p.id === profile.id)
        ? prev.filter((p) => p.id !== profile.id)
        : [...prev, profile],
    );
  };

  const removeDraft = (profileId: string) => {
    setDraft((prev) => prev.filter((p) => p.id !== profileId));
  };

  const confirmMultiple = () => {
    void Promise.resolve(onConfirm(draft)).then(() => {
      onOpenChange(false);
    });
  };

  const singleSelectionId = selectedProfiles[0]?.id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={dialogContentClassName}>
        <DialogHeader>
          <DialogTitle>
            {title ??
              t('profile.selector.title', { defaultValue: 'Select profiles' })}
          </DialogTitle>
        </DialogHeader>

        {mode === 'multiple' && draft.length > 0 ? (
          <div className="shrink-0 border-b pb-2">
            <div className="flex max-h-40 flex-wrap content-start gap-2 overflow-y-auto">
              {draft.map((profile) => (
                <ProfileBadge
                  key={profile.id}
                  profile={profile}
                  onRemove={() => removeDraft(profile.id)}
                />
              ))}
            </div>
          </div>
        ) : null}

        <div className="relative">
          <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
          <Input
            value={searchString}
            onChange={(e) => setSearchString(e.target.value)}
            className="pl-9"
            placeholder={t('profile.selector.search', {
              defaultValue: 'Search profiles…',
            })}
            autoFocus
          />
        </div>

        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
          {profilesQuery.isSuccess || allowlist ? (
            selectableProfiles.length === 0 ? (
              <p className="text-muted-foreground p-4 text-center text-sm">
                {searchString
                  ? t('profile.selector.emptySearch', {
                      defaultValue: 'No results found',
                    })
                  : t('profile.selector.empty', {
                      defaultValue: 'No profiles available',
                    })}
              </p>
            ) : (
              selectableProfiles.map((profile) => {
                const selected =
                  mode === 'single'
                    ? profile.id === singleSelectionId || isSelected(profile.id)
                    : isSelected(profile.id);
                return (
                  <button
                    key={profile.id}
                    type="button"
                    className={`hover:bg-surface rounded-button flex w-full items-center gap-3 p-2 text-left ${selected ? 'bg-secondary/40' : ''}`}
                    onClick={() => toggleProfile(profile)}
                  >
                    <Avatar profile={profile} size={2.5} borderless />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {profileName(profile)}
                      </span>
                      {profile.handle ? (
                        <span className="text-muted-foreground block truncate text-xs">
                          @{profile.handle}
                        </span>
                      ) : null}
                    </span>
                    {selected ? (
                      <Check className="text-primary size-4 shrink-0" />
                    ) : null}
                  </button>
                );
              })
            )
          ) : null}
        </div>

        {mode === 'multiple' ? (
          <DialogActions
            cancelLabel={t('common.cancel', { defaultValue: 'Cancel' })}
            onCancel={() => onOpenChange(false)}
            actionLabel={t('profile.selector.confirm', { defaultValue: 'OK' })}
            onAction={confirmMultiple}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
