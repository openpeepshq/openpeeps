import { useParams } from 'react-router-dom';
import { useT, useOpenpeeps, useSetPageHeader, useNavigate } from '../../index';
import { Avatar } from '../../components';
import { Button } from '@openpeepshq/react-ui';

const StatRow = ({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) => (
  <div className="flex items-center justify-between py-2">
    <span className="text-muted-foreground text-sm">{label}</span>
    <span className="font-medium">{value}</span>
  </div>
);

export function AdminMemberDetail() {
  const t = useT();
  const navigate = useNavigate();
  const { openpeepsApi } = useOpenpeeps();
  const { profileId = '' } = useParams<{ profileId: string }>();

  const summaryQuery = openpeepsApi.admin.useAdminProfileSummary(profileId);

  useSetPageHeader(
    summaryQuery.data?.profile
      ? `${summaryQuery.data!.profile.displayName || summaryQuery.data!.profile.handle} — ${t('admin.members.title', { defaultValue: 'Members' })}`
      : t('admin.members.title', { defaultValue: 'Members' }),
  );

  if (summaryQuery.isLoading) {
    return (
      <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
        {t('common.form.loading', { defaultValue: 'Loading…' })}
      </div>
    );
  }

  if (!summaryQuery.data) {
    return (
      <div className="p-4">
        {t('admin.members.notFound', {
          defaultValue: 'Profile not found',
        })}
      </div>
    );
  }

  const data = summaryQuery.data;
  const profile = data.profile;

  const formattedDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  return (
    <div className="p-4">
      <div className="mb-6 flex items-center gap-4">
        <Avatar profile={profile} size={4} />
        <div>
          <h2 className="text-xl font-bold">
            {profile.displayName || `@${profile.handle}`}
          </h2>
          <p className="text-muted-foreground">@{profile.handle}</p>
        </div>
      </div>

      <div className="space-y-6">
        <section>
          <h3 className="text-sm font-semibold uppercase">
            {t('admin.members.profileInfo', {
              defaultValue: 'Profile Information',
            })}
          </h3>
          <div className="border-border border-t">
            <StatRow
              label={t('admin.members.dateJoined', {
                defaultValue: 'Date joined',
              })}
              value={formattedDate(data.createdAt)}
            />
            <StatRow
              label={t('admin.members.emailAddress', {
                defaultValue: 'Email address',
              })}
              value={data.email ?? '—'}
            />
            <StatRow
              label={t('admin.members.profileId', {
                defaultValue: 'Profile ID',
              })}
              value={profile.id}
            />
          </div>
        </section>

        <section>
          <h3 className="text-sm font-semibold uppercase">
            {t('admin.members.activity', {
              defaultValue: 'Activity',
            })}
          </h3>
          <div className="border-border border-t">
            <StatRow
              label={t('admin.members.followers', {
                defaultValue: 'Followers',
              })}
              value={data.followersCount}
            />
            <StatRow
              label={t('admin.members.following', {
                defaultValue: 'Following',
              })}
              value={data.followingCount}
            />
            <StatRow
              label={t('admin.members.posts', {
                defaultValue: 'Posts',
              })}
              value={data.activity.postsCount}
            />
            <StatRow
              label={t('admin.members.replies', {
                defaultValue: 'Replies',
              })}
              value={data.activity.repliesCount}
            />
            <StatRow
              label={t('admin.members.events', {
                defaultValue: 'Events',
              })}
              value={data.activity.eventsCount}
            />
            <StatRow
              label={t('admin.members.groups', {
                defaultValue: 'Groups',
              })}
              value={data.activity.groupsCount}
            />
            <StatRow
              label={t('admin.members.reports', {
                defaultValue: 'Reports',
              })}
              value={data.reportsCount}
            />
            <StatRow
              label={t('admin.members.blockedBy', {
                defaultValue: 'Blocked by',
              })}
              value={data.blockedByCount}
            />
            <StatRow
              label={t('admin.members.rsvps', {
                defaultValue: 'RSVPs',
              })}
              value={data.activity.rsvpsCount}
            />
            <StatRow
              label={t('admin.members.bookmarks', {
                defaultValue: 'Bookmarks',
              })}
              value={data.activity.bookmarksCount}
            />
          </div>
        </section>
      </div>

      <div className="mt-6">
        <Button
          variant="outline"
          compact
          action={() => navigate({ type: 'admin', section: 'members' })}
          title={t('admin.members.backToMembers', {
            defaultValue: 'Back to members',
          })}
        >
          {t('admin.members.backToMembers', {
            defaultValue: 'Back to members',
          })}
        </Button>
      </div>
    </div>
  );
}
