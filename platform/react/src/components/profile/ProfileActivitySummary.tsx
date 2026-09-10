import { Rss } from 'lucide-react';
import type { ReactNode } from 'react';
import type {
  ProfileActivitySummary as ProfileActivitySummaryData,
  PublicProfile,
} from '@openpeepshq/common/types';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useT } from '../../i18n';
import { AccessDeniedLoader } from '../layout/AccessDeniedLoader';
import { FeedPost } from '../post/FeedPost';

export interface ProfileActivitySummaryProps {
  profile: PublicProfile;
}

const CountCard = ({
  value,
  label,
  testId,
}: {
  value: number;
  label: string;
  testId: string;
}) => (
  <div className="bg-background min-w-0 rounded-xl border p-4">
    <div
      className="text-2xl font-semibold tabular-nums tracking-tight"
      data-testid={testId}
    >
      {value.toLocaleString()}
    </div>
    <div className="text-muted-foreground mt-1 text-sm">{label}</div>
  </div>
);

const CountSection = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <section className="px-4 pb-4">
    <h2 className="pb-2 text-sm font-medium">{title}</h2>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{children}</div>
  </section>
);

const SummaryBody = ({ summary }: { summary: ProfileActivitySummaryData }) => {
  const t = useT();

  return (
    <div className="flex flex-col" data-testid="profile-activity-summary">
      <CountSection
        title={t('profile.activity.yourContent', {
          defaultValue: 'Your posts',
        })}
      >
        <CountCard
          value={summary.postsCount}
          label={t('profile.activity.postsCount', { defaultValue: 'Posts' })}
          testId="profile-activity-posts-count"
        />
        <CountCard
          value={summary.repliesCount}
          label={t('profile.activity.repliesCount', {
            defaultValue: 'Replies',
          })}
          testId="profile-activity-replies-count"
        />
        <CountCard
          value={summary.eventsCount}
          label={t('profile.activity.eventsCount', { defaultValue: 'Events' })}
          testId="profile-activity-events-count"
        />
      </CountSection>

      <CountSection
        title={t('profile.activity.yourActions', {
          defaultValue: 'Your actions',
        })}
      >
        <CountCard
          value={summary.reactionsGiven}
          label={t('profile.activity.reactionsGiven', {
            defaultValue: 'Reactions',
          })}
          testId="profile-activity-reactions-given"
        />
        <CountCard
          value={summary.repostsCount}
          label={t('profile.activity.repostsCount', {
            defaultValue: 'Reposts',
          })}
          testId="profile-activity-reposts-count"
        />
        <CountCard
          value={summary.rsvpsCount}
          label={t('profile.activity.rsvpsCount', { defaultValue: 'RSVPs' })}
          testId="profile-activity-rsvps-count"
        />
        <CountCard
          value={summary.bookmarksCount}
          label={t('profile.activity.bookmarksCount', {
            defaultValue: 'Bookmarks',
          })}
          testId="profile-activity-bookmarks-count"
        />
        <CountCard
          value={summary.groupsCount}
          label={t('profile.activity.groupsCount', { defaultValue: 'Groups' })}
          testId="profile-activity-groups-count"
        />
      </CountSection>

      <CountSection
        title={t('profile.activity.received', {
          defaultValue: 'Received',
        })}
      >
        <CountCard
          value={summary.reactionsReceived}
          label={t('profile.activity.reactionsReceived', {
            defaultValue: 'Reactions',
          })}
          testId="profile-activity-reactions-received"
        />
        <CountCard
          value={summary.repliesReceived}
          label={t('profile.activity.repliesReceived', {
            defaultValue: 'Replies',
          })}
          testId="profile-activity-replies-received"
        />
        <CountCard
          value={summary.repostsReceived}
          label={t('profile.activity.repostsReceived', {
            defaultValue: 'Reposts',
          })}
          testId="profile-activity-reposts-received"
        />
      </CountSection>

      <h2 className="px-4 pb-2 text-sm font-medium">
        {t('profile.activity.topPosts', {
          defaultValue: 'Top posts',
        })}
      </h2>

      {summary.topPosts.length ? (
        <div className="bg-surface flex flex-col gap-0.5">
          {summary.topPosts.map((post) => (
            <a
              key={post.id}
              href={`/posts/${post.repost ? post.repost.id : post.id}`}
              className="block"
            >
              <FeedPost post={post} showReplyTo className="border-b-0" />
            </a>
          ))}
        </div>
      ) : (
        <div className="flex h-64 w-full flex-col items-center justify-center gap-y-4">
          <Rss className="text-muted-foreground size-16" />
          <p className="text-muted-foreground text-sm">
            {t('profile.activity.emptyTopPosts', {
              defaultValue: 'No posts to rank yet.',
            })}
          </p>
        </div>
      )}
    </div>
  );
};

export function ProfileActivitySummary({
  profile,
}: ProfileActivitySummaryProps) {
  const { openpeepsApi } = useOpenpeeps();
  const query = openpeepsApi.useProfileActivitySummary(profile.id);

  return (
    <AccessDeniedLoader queries={[query]}>
      {query.data ? <SummaryBody summary={query.data} /> : null}
    </AccessDeniedLoader>
  );
}
