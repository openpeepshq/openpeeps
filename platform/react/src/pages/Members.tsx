import { useEffect, useMemo, useState } from 'react';
import { matchesQuery, sortProfiles } from '@openpeepshq/common/lib';
import { useT, useOpenpeeps } from '../index';
import { ProfileCard, AccessDeniedLoader } from '../components';
import { Input } from '@openpeepshq/react-ui';

const SEARCH_DEBOUNCE_MS = 300;
const MIN_SEARCH_LENGTH = 3;

export function Members() {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const profilesQuery = openpeepsApi.useProfiles();
  const profiles = profilesQuery.data ?? [];

  // Mirror SearchAndFilterBar.svelte: only filter on >=3 chars, debounced.
  useEffect(() => {
    if (searchInput.length < MIN_SEARCH_LENGTH) {
      setSearch('');
      return;
    }
    const timeout = setTimeout(() => {
      setSearch(searchInput);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const filtered = useMemo(
    () =>
      sortProfiles(profiles).filter((p) => !search || matchesQuery(p, search)),
    [profiles, search],
  );

  return (
    <AccessDeniedLoader queries={[profilesQuery]}>
      <div className="p-4">
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
          }}
        >
          <Input
            placeholder={t('members.searchPlaceholder', {
              defaultValue: 'Search member by name or handle',
            })}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            data-testid="members-search-input"
          />
        </form>

        <div className="my-4 pb-10">
          {filtered.map((profile) => (
            <ProfileCard key={profile.id} profile={profile} />
          ))}
          {filtered.length === 0 && (
            <div className="flex w-full items-center justify-center p-4">
              <h2 className="text-lg">
                {t('members.empty', { defaultValue: 'No profiles found' })}
              </h2>
            </div>
          )}
        </div>

        {profilesQuery.error && (
          <div className="text-error w-full text-center text-sm">
            {t('members.fetchError', {
              defaultValue: 'Failed to fetch accounts. Please try again later.',
            })}
          </div>
        )}
      </div>
    </AccessDeniedLoader>
  );
}
