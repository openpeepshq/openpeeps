import { useState } from 'react';
import { Users } from 'lucide-react';
import type { PublicProfile } from '@openpeepshq/common/types';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useT } from '../../i18n';
import { useNavigate } from '../../contexts/router';
import { AccessDeniedLoader } from '../layout/AccessDeniedLoader';
import { Feed } from '../post/Feed';
import { GroupCard } from '../groups/GroupCard';
import { ProfileActivitySummary } from './ProfileActivitySummary';

export interface ProfilePostsAndRepliesProps {
  profile: PublicProfile;
  isCurrentProfile?: boolean;
}

type ProfileTab = 'posts' | 'activity' | 'groups';

/**
 * Translation of `profilePage/ProfilePostsAndReplies.svelte` with posts,
 * activity, and common-groups tabs.
 */
export function ProfilePostsAndReplies({
  profile,
  isCurrentProfile = false,
}: ProfilePostsAndRepliesProps) {
  const t = useT();
  const navigate = useNavigate();
  const { openpeepsApi } = useOpenpeeps();
  const postsQuery = openpeepsApi.usePostsByProfile(profile.id);
  const commonGroupsQuery = openpeepsApi.useCommonGroups(profile.id);
  const [tab, setTab] = useState<ProfileTab>('posts');
  const activeTab = tab === 'activity' && !isCurrentProfile ? 'posts' : tab;

  return (
    <div>
      <nav
        aria-label={t('profile.tabs.label', {
          defaultValue: 'Profile sections',
        })}
        className="flex border-b"
      >
        <button
          type="button"
          className={`flex-1 px-4 py-3 text-sm font-medium ${activeTab === 'posts' ? 'border-primary border-b-2' : 'text-muted-foreground'}`}
          onClick={() => setTab('posts')}
        >
          {t('profile.posts', { defaultValue: 'Posts' })}
        </button>
        {isCurrentProfile ? (
          <button
            type="button"
            className={`flex-1 px-4 py-3 text-sm font-medium ${activeTab === 'activity' ? 'border-primary border-b-2' : 'text-muted-foreground'}`}
            onClick={() => setTab('activity')}
            data-testid="profile-activity-tab"
          >
            {t('profile.activity.tab', { defaultValue: 'Activity' })}
          </button>
        ) : null}
        <button
          type="button"
          className={`flex-1 px-4 py-3 text-sm font-medium ${activeTab === 'groups' ? 'border-primary border-b-2' : 'text-muted-foreground'}`}
          onClick={() => setTab('groups')}
        >
          {t('profile.groups.tabName', { defaultValue: 'Groups' })}
        </button>
      </nav>

      {activeTab === 'posts' ? (
        <Feed query={postsQuery} />
      ) : activeTab === 'activity' ? (
        <ProfileActivitySummary profile={profile} />
      ) : (
        <AccessDeniedLoader queries={[commonGroupsQuery]}>
          {(commonGroupsQuery.data ?? []).map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              onSelect={() => navigate({ type: 'group', handle: group.handle })}
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
