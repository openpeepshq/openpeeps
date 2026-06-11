import { useT, useOpenpeeps, useSetPageHeader } from '@openpeeps/react';
import { Avatar } from '@openpeeps/react/components';
import { SignupChart } from './components/AdminCharts';

function StatRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between border-b py-2">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

function BreakdownCard({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="bg-surface-100 flex h-24 flex-col items-center justify-center rounded-md">
      <span className="text-sm">{label}</span>
      <span className="text-4xl font-semibold">{value}</span>
    </div>
  );
}

export function AdminAnalytics() {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const statsQuery = openpeepsApi.admin.useGeneralStats();

  useSetPageHeader(t('admin.analytics.title', { defaultValue: 'Analytics' }));

  if (statsQuery.isLoading) {
    return (
      <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
        {t('common.loading', { defaultValue: 'Loading…' })}
      </div>
    );
  }

  const stats = statsQuery.data;
  if (!stats) return null;

  const periods = ['day', 'week', 'month', 'quarter', 'year'] as const;

  const topPostsOfYear = stats.topLists.posts.year;
  const topProfilesOfYear = stats.topLists.profiles.year;

  return (
    <div className="space-y-6 p-4">
      <section>
        <h2 className="mb-2 text-lg font-medium">
          {t('admin.overview.newSignups', { defaultValue: 'New signups' })}
        </h2>
        <SignupChart stats={stats} />
      </section>

      <section>
        <h2 className="mb-2 text-lg font-medium">Active profiles</h2>
        <div className="rounded-md border p-4">
          {periods.map((p) => (
            <StatRow
              key={p}
              label={`${p}: current period`}
              value={stats.profiles.active[p].currentPeriod}
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-medium">Posts</h2>
        <div className="rounded-md border p-4">
          {periods.map((p) => (
            <StatRow
              key={p}
              label={`${p}: posts`}
              value={stats.posts.all[p].currentPeriod}
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-medium">
          {t('admin.overview.content', { defaultValue: 'Content' })}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <BreakdownCard
            label={t('admin.overview.allPosts', { defaultValue: 'All Posts' })}
            value={stats.posts.all.all}
          />
          <BreakdownCard
            label={t('admin.overview.postsWithoutReplies', {
              defaultValue: 'Posts without replies',
            })}
            value={stats.posts.withoutReply.all}
          />
          <BreakdownCard
            label={t('admin.overview.postsWithReplies', {
              defaultValue: 'Posts with replies',
            })}
            value={stats.posts.withReplies.all}
          />
          <BreakdownCard
            label={t('admin.overview.replies', { defaultValue: 'Replies' })}
            value={stats.posts.replies.all}
          />
        </div>
      </section>

      {topProfilesOfYear.length > 0 ? (
        <section>
          <h2 className="mb-2 text-lg font-medium">
            {t('admin.overview.topProfilesOfYear', {
              defaultValue: `Top ${topProfilesOfYear.length} profiles of the year`,
              count: topProfilesOfYear.length,
            })}
          </h2>
          <div className="rounded-md border">
            {topProfilesOfYear.map((profile) => (
              <a
                key={profile.id}
                href={`/@${profile.handle}`}
                className="hover:bg-surface-100 flex items-center gap-2 border-b p-2 last:border-b-0"
              >
                <Avatar profile={profile} size={2} />
                <span className="flex-1">
                  {profile.displayName || `@${profile.handle}`}
                </span>
                <span className="text-muted-foreground text-sm">
                  score {profile.activityScore.toFixed(0)}
                </span>
              </a>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="mb-2 text-lg font-medium">Top profiles (this month)</h2>
        <div className="rounded-md border">
          {stats.topLists.profiles.month.map((profile) => (
            <a
              key={profile.id}
              href={`/@${profile.handle}`}
              className="hover:bg-surface-100 flex items-center justify-between border-b p-2 last:border-b-0"
            >
              <span>{profile.displayName || `@${profile.handle}`}</span>
              <span className="text-muted-foreground text-sm">
                score {profile.activityScore.toFixed(0)}
              </span>
            </a>
          ))}
          {stats.topLists.profiles.month.length === 0 && (
            <p className="text-muted-foreground p-3 text-sm">No data</p>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-medium">
          {t('admin.overview.topPostsOfYear', {
            defaultValue: `Top ${topPostsOfYear.length} posts of the year`,
            count: topPostsOfYear.length,
          })}
        </h2>
        <div className="rounded-md border">
          {topPostsOfYear.map((post) => (
            <a
              key={post.id}
              href={`/posts/${post.id}`}
              className="hover:bg-surface-100 flex items-center justify-between gap-3 border-b p-2 last:border-b-0"
            >
              <span className="min-w-0 flex-1 truncate text-sm">
                {(post.data as { content?: string })?.content ||
                  `@${post.profile.handle}`}
              </span>
              <span className="text-muted-foreground shrink-0 text-sm">
                score {post.activityScore.toFixed(0)}
              </span>
            </a>
          ))}
          {topPostsOfYear.length === 0 && (
            <p className="text-muted-foreground p-3 text-sm">No data</p>
          )}
        </div>
      </section>
    </div>
  );
}
