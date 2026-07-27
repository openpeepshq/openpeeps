import { useState } from 'react';
import { Users } from 'lucide-react';
import type { PublicProfile } from '@openpeeps/common/types';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useT } from '../../i18n';
import { useNavigate } from '../../contexts/router';
import { AccessDeniedLoader } from '../layout/AccessDeniedLoader';
import { Feed } from '../post/Feed';
import { GroupCard } from '../groups/GroupCard';

export interface ProfilePostsAndRepliesProps {
  profile: PublicProfile;
}

/**
 * Translation of `profilePage/ProfilePostsAndReplies.svelte` with posts and
 * common-groups tabs.
 */
export function ProfilePostsAndReplies({
  profile,
}: ProfilePostsAndRepliesProps) {
  const t = useT();
  const navigate = useNavigate();
  const { openpeepsApi } = useOpenpeeps();
  const postsQuery = openpeepsApi.usePostsByProfile(profile.id);
  const commonGroupsQuery = openpeepsApi.useCommonGroups(profile.id);
  const [tab, setTab] = useState<'posts' | 'groups'>('posts');

  return (
    <div>
      <div className="border-b flex">
        <button
          type="button"
          className={`flex-1 px-4 py-3 text-sm font-medium ${tab === 'posts' ? 'border-primary border-b-2' : 'text-muted-foreground'}`}
          onClick={() => setTab('posts')}
        >
          {t('profile.posts', { defaultValue: 'Posts' })}
        </button>
        <button
          type="button"
          className={`flex-1 px-4 py-3 text-sm font-medium ${tab === 'groups' ? 'border-primary border-b-2' : 'text-muted-foreground'}`}
          onClick={() => setTab('groups')}
        >
          {t('profile.groups.tabName', { defaultValue: 'Groups' })}
        </button>
      </div>

      {tab === 'posts' ? (
        <Feed query={postsQuery} />
      ) : (
        <AccessDeniedLoader queries={[commonGroupsQuery]}>
          {(commonGroupsQuery.data ?? []).map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              onSelect={() => navigate(`/groups/@${group.handle}`)}
            />
          ))}
          {!commonGroupsQuery.data?.length ? (
            <div className="flex h-[60vh] w-full flex-col items-center justify-center gap-y-6">
              <Users size={60} />
              <p>
                {t('profile.groups.noCommonGroups', {
                  defaultValue: 'No groups in common',
                })}
              </p>
            </div>
          ) : null}
        </AccessDeniedLoader>
      )}
    </div>
  );
}
