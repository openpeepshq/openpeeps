import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, Users, X } from 'lucide-react';
import type { PublicProfile } from '@openpeeps/common/types';
import { matchesQuery, profileName, sortProfiles } from '@openpeeps/common/lib';
import { Button, Input } from '@openpeeps/react-ui';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useT } from '../../i18n';
import { Avatar } from './Avatar';

export interface ProfileSelectorProps {
  selectedProfiles: PublicProfile[];
  onChange: (profiles: PublicProfile[]) => void;
  placeholder?: string;
  profilesToExclude?: PublicProfile[];
  containerClassName?: string;
}

export const ProfileSelector = ({
  selectedProfiles,
  onChange,
  placeholder = '',
  profilesToExclude = [],
  containerClassName,
}: ProfileSelectorProps) => {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const profilesQuery = openpeepsApi.useProfiles();
  const [isOpen, setIsOpen] = useState(false);
  const [searchString, setSearchString] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const excludeIds = useMemo(
    () => new Set(profilesToExclude.map((p) => p.id)),
    [profilesToExclude],
  );

  const selectableProfiles = useMemo(
    () =>
      sortProfiles(
        (profilesQuery.data ?? [])
          .filter((p) => !excludeIds.has(p.id))
          .filter((p) => !searchString || matchesQuery(p, searchString)),
      ),
    [profilesQuery.data, excludeIds, searchString],
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchString('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const removeProfile = (profileId: string) => {
    onChange(selectedProfiles.filter((p) => p.id !== profileId));
  };

  const addProfile = (profile: PublicProfile) => {
    if (!selectedProfiles.some((p) => p.id === profile.id)) {
      onChange([...selectedProfiles, profile]);
    }
    setSearchString('');
  };

  const isProfileSelected = (profileId: string) =>
    selectedProfiles.some((p) => p.id === profileId);

  return (
    <div
      ref={containerRef}
      className={`relative w-full ${containerClassName ?? ''}`}
    >
      <Button
        className="border-surface-300 bg-surface-200 flex min-h-10 w-full items-center justify-between rounded-lg border px-3 py-1 text-left"
        action={() => setIsOpen((open) => !open)}
      >
        <div className="flex flex-1 flex-wrap items-center gap-1">
          {selectedProfiles.length === 0 ? (
            <span className="text-muted-foreground flex items-center gap-2">
              <Users className="size-4" />
              {placeholder}
            </span>
          ) : (
            selectedProfiles.map((profile) => (
              <div
                key={profile.id}
                className="border-secondary bg-surface-50 text-primary flex items-center gap-1.5 rounded-md border px-2 py-1 text-sm"
              >
                <Avatar profile={profile} size={0.75} borderless />
                <span className="font-medium">{profileName(profile)}</span>
                <button
                  type="button"
                  className="hover:bg-secondary ml-1 rounded-full p-0.5 transition-colors"
                  title={t('common.remove', { defaultValue: 'Remove' })}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeProfile(profile.id);
                  }}
                >
                  <X className="size-3" />
                </button>
              </div>
            ))
          )}
        </div>
        <ChevronDown
          className={`text-surface-600 size-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </Button>

      {isOpen ? (
        <div className="border-surface-300 bg-surface-200 absolute z-[1000] mt-1 w-full rounded-lg border shadow-lg">
          <div className="border-surface-300 border-b p-3">
            <div className="relative">
              <Search className="text-primary absolute left-3 top-1/2 size-4 -translate-y-1/2" />
              <Input
                value={searchString}
                onChange={(e) => setSearchString(e.target.value)}
                className="border-surface-300 bg-surface-50 w-full rounded-md border py-2 pl-10 pr-3 text-sm"
                placeholder={t('profile.search.profilesPlaceholder', {
                  defaultValue: 'Search profiles…',
                })}
              />
            </div>
          </div>

          {profilesQuery.isSuccess ? (
            <div className="max-h-64 overflow-y-auto">
              {selectableProfiles.length === 0 ? (
                <div className="text-surface-500 p-4 text-center text-sm">
                  {searchString
                    ? t('profile.search.noResults', {
                        defaultValue: 'No results',
                      })
                    : t('profile.search.noProfilesAvailable', {
                        defaultValue: 'No profiles available',
                      })}
                </div>
              ) : (
                selectableProfiles.map((profile) => (
                  <Button
                    key={profile.id}
                    className={`border-surface-300 hover:bg-surface-100 flex w-full items-center justify-between border-b-[0.5px] p-3 text-left transition-colors last:border-b-0 ${isProfileSelected(profile.id) ? 'bg-secondary text-primary' : ''}`}
                    action={() => addProfile(profile)}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar profile={profile} size={1.25} borderless />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          {profileName(profile)}
                        </span>
                        {profile.handle ? (
                          <span className="text-xs text-gray-500">
                            {profile.handle}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    {isProfileSelected(profile.id) ? (
                      <Check className="text-primary size-4" />
                    ) : null}
                  </Button>
                ))
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};
