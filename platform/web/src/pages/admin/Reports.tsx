import { useMemo, useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import type { ReportWithMeta } from '@openpeeps/common/types';
import { useT, useOpenpeeps } from '@openpeeps/react';
import type { PublicPost } from '@openpeeps/common/types';
import {
  Avatar,
  FeedPostContent,
  UpdatingDate,
} from '@openpeeps/react/components';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@openpeeps/react-ui';
import { routeHandleParam } from '../../lib/routeHandles';

export function AdminReports() {
  const t = useT();
  const { handle: handleParam = '' } = useParams<{ handle: string }>();
  const handle = routeHandleParam(handleParam);
  const { openpeepsApi } = useOpenpeeps();
  const profileQuery = openpeepsApi.useProfileByHandle(handle);
  const reportsQuery = openpeepsApi.admin.useReportsList();
  const reopen = openpeepsApi.admin.reopenReportAction();

  const [tab, setTab] = useState<'post' | 'profile'>('post');
  const [filter, setFilter] = useState<'all' | 'resolved' | 'not-resolved'>(
    'not-resolved',
  );
  const [resolving, setResolving] = useState<ReportWithMeta | null>(null);
  const initialTabHandle = useRef<string | null>(null);

  const profile = profileQuery.data;

  const profileReportsBase = useMemo(() => {
    const all = reportsQuery.data ?? [];
    return all.filter((r) =>
      profile
        ? r.reportedProfile.id === profile.id
        : r.reportedProfile.handle === handle,
    );
  }, [reportsQuery.data, profile, handle]);

  useEffect(() => {
    if (!profile || reportsQuery.isLoading || !reportsQuery.data) return;
    if (initialTabHandle.current === handle) return;
    initialTabHandle.current = handle;

    const unresolvedPost = profileReportsBase.filter(
      (r) => r.reportedPosts.length > 0 && !r.resolution,
    ).length;
    const unresolvedProfile = profileReportsBase.filter(
      (r) => r.reportedPosts.length === 0 && !r.resolution,
    ).length;

    setTab(unresolvedPost === 0 && unresolvedProfile > 0 ? 'profile' : 'post');
  }, [
    profile,
    handle,
    reportsQuery.data,
    reportsQuery.isLoading,
    profileReportsBase,
  ]);

  const reports = useMemo(
    () =>
      profileReportsBase
        .filter((r) =>
          tab === 'profile'
            ? r.reportedPosts.length === 0
            : r.reportedPosts.length > 0,
        )
        .filter((r) => {
          if (filter === 'resolved') return !!r.resolution;
          if (filter === 'not-resolved') return !r.resolution;
          return true;
        }),
    [profileReportsBase, tab, filter],
  );

  if (profileQuery.isLoading || reportsQuery.isLoading) {
    return (
      <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
        {t('common.loading', { defaultValue: 'Loading…' })}
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-8 text-center text-2xl">
        {t('profiles.notFound', { defaultValue: 'Profile not found' })}
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <header className="flex items-center gap-3">
        <Avatar profile={profile} size={3} />
        <div className="flex-1">
          <h1 className="text-xl font-semibold">
            {profile.displayName || `@${profile.handle}`}
          </h1>
          <p className="text-muted-foreground text-sm">@{profile.handle}</p>
        </div>
        <a
          href={`/@${profile.handle}`}
          className="border-input hover:bg-surface-100 rounded-md border px-3 py-1.5 text-sm"
        >
          {t('admin.moderation.report.goToProfile', {
            defaultValue: 'Go to profile',
          })}
        </a>
      </header>

      <nav className="border-border flex border-b">
        <TabButton active={tab === 'post'} onClick={() => setTab('post')}>
          Post Reports
        </TabButton>
        <TabButton active={tab === 'profile'} onClick={() => setTab('profile')}>
          Profile Reports
        </TabButton>
      </nav>

      <div className="flex items-center gap-2 text-xs">
        <span className="text-muted-foreground">Filter:</span>
        {(['all', 'not-resolved', 'resolved'] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={`rounded px-2 py-1 ${filter === value ? 'bg-primary text-primary-foreground' : 'bg-surface-100 hover:bg-surface-200'}`}
          >
            {value === 'all'
              ? 'All'
              : value === 'resolved'
                ? 'Resolved'
                : 'Not resolved'}
          </button>
        ))}
      </div>

      {reports.length === 0 ? (
        <p className="text-muted-foreground text-sm">No reports.</p>
      ) : (
        <ul className="space-y-3">
          {reports.map((report) => (
            <li key={report.id} className="space-y-1 rounded-md border p-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-xs">
                  <UpdatingDate date={report.createdAt} /> · @
                  {report.reporterProfile.handle} reported
                </span>
                <span
                  className={`rounded px-2 py-0.5 text-xs ${report.resolution ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}`}
                >
                  {report.resolution ? 'Resolved' : 'Open'}
                </span>
              </div>
              <p className="text-sm">{report.comment}</p>
              {report.reportedPosts.length > 0 && (
                <ul className="space-y-2">
                  {report.reportedPosts.map((post) => (
                    <li key={post.id} className="bg-surface-100 rounded-md p-2">
                      <div className="mb-2 flex items-center justify-between">
                        <h3 className="text-sm font-medium">
                          {t('admin.moderation.reportList.postHeading', {
                            defaultValue: 'Reported post',
                          })}
                        </h3>
                        <a
                          href={`/posts/${post.repost?.id ?? post.id}`}
                          className="border-input hover:bg-surface-200 rounded-md border px-2 py-1 text-xs"
                        >
                          {t('admin.moderation.reportList.goToPost', {
                            defaultValue: 'Go to post',
                          })}
                        </a>
                      </div>
                      <FeedPostContent post={post as PublicPost} />
                    </li>
                  ))}
                </ul>
              )}
              {report.resolution ? (
                <Button
                  title={t('admin.moderation.reopen', {
                    defaultValue: 'Reopen',
                  })}
                  variant="variant-ghost-primary"
                  action={() => reopen({ reportId: report.id })}
                >
                  {t('admin.moderation.reopen', { defaultValue: 'Reopen' })}
                </Button>
              ) : (
                <Button
                  title={t('admin.moderation.reportList.closeReport', {
                    defaultValue: 'Close',
                  })}
                  variant="variant-ringed-error"
                  action={() => setResolving(report)}
                >
                  {t('admin.moderation.reportList.closeReport', {
                    defaultValue: 'Close',
                  })}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {resolving ? (
        <ResolveReportModal
          report={resolving}
          onClose={() => setResolving(null)}
        />
      ) : null}
    </div>
  );
}

type ResolveStep =
  | 'options'
  | 'confirmPost'
  | 'confirmProfile'
  | 'confirmClose';

function ResolveReportModal({
  report,
  onClose,
}: {
  report: ReportWithMeta;
  onClose: () => void;
}) {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const resolveReport = openpeepsApi.admin.resolveReportAction({
    reportId: report.id,
  });
  const deletePost = openpeepsApi.deletePostAction();
  const deleteProfile = openpeepsApi.admin.deleteProfileAction();

  const [step, setStep] = useState<ResolveStep>('options');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isProfileReport = report.reportedPosts.length === 0;
  const firstPostId = report.reportedPosts[0]?.id;

  const run = async (fn: () => Promise<unknown>) => {
    setError(null);
    setSubmitting(true);
    try {
      await fn();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const closeReport = () => run(() => resolveReport({ resolution: 'ignore' }));
  const removeAndResolve = (op: () => Promise<unknown>) =>
    run(async () => {
      await op();
      await resolveReport({ resolution: 'remove' });
    });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === 'options'
              ? t('admin.moderation.report.closeOptions.title', {
                  defaultValue: 'Close this report?',
                })
              : step === 'confirmPost'
                ? t('admin.moderation.post.delete.title', {
                    defaultValue: 'Delete this post?',
                  })
                : step === 'confirmProfile'
                  ? t('admin.moderation.profile.delete.title', {
                      defaultValue: 'Delete this profile?',
                    })
                  : t('admin.moderation.report.close.title', {
                      defaultValue: 'Just close report?',
                    })}
          </DialogTitle>
        </DialogHeader>

        {step === 'options' ? (
          <div className="space-y-4 px-1">
            <p className="text-muted-foreground text-sm">
              {t('admin.moderation.report.closeOptions.description', {
                defaultValue:
                  'You are about to close this report, select an action below to close it:',
              })}
            </p>
            {!isProfileReport && firstPostId ? (
              <div className="space-y-1">
                <Button
                  title={t(
                    'admin.moderation.report.closeOptions.deletePost.button',
                    {
                      defaultValue: 'Delete Post',
                    },
                  )}
                  variant="variant-filled-error"
                  action={() => setStep('confirmPost')}
                >
                  {t('admin.moderation.report.closeOptions.deletePost.button', {
                    defaultValue: 'Delete Post',
                  })}
                </Button>
                <p className="text-muted-foreground text-xs">
                  {t(
                    'admin.moderation.report.closeOptions.deletePost.description',
                    {
                      defaultValue:
                        'Post will no longer be on the feed and community',
                    },
                  )}
                </p>
              </div>
            ) : null}
            <div className="space-y-1">
              <Button
                title={t(
                  'admin.moderation.report.closeOptions.deleteProfile.button',
                  {
                    defaultValue: 'Delete Profile',
                  },
                )}
                variant={
                  isProfileReport
                    ? 'variant-filled-error'
                    : 'variant-ringed-error'
                }
                action={() => setStep('confirmProfile')}
              >
                {t(
                  'admin.moderation.report.closeOptions.deleteProfile.button',
                  {
                    defaultValue: 'Delete Profile',
                  },
                )}
              </Button>
              <p className="text-muted-foreground text-xs">
                {t(
                  'admin.moderation.report.closeOptions.deleteProfile.description',
                  {
                    defaultValue:
                      'Prevents the profile from showing up in lists and being seen by anyone, removes content also.',
                  },
                )}
              </p>
            </div>
            <div className="space-y-1">
              <Button
                title={t(
                  'admin.moderation.report.closeOptions.closeReport.button',
                  {
                    defaultValue: 'Just close it',
                  },
                )}
                variant="variant-ringed-primary"
                action={() => setStep('confirmClose')}
              >
                {t('admin.moderation.report.closeOptions.closeReport.button', {
                  defaultValue: 'Just close it',
                })}
              </Button>
              <p className="text-muted-foreground text-xs">
                {t(
                  'admin.moderation.report.closeOptions.closeReport.description',
                  {
                    defaultValue: 'Resolve this report without doing anything',
                  },
                )}
              </p>
            </div>
          </div>
        ) : (
          <p className="px-1 text-sm">
            {step === 'confirmPost'
              ? t('admin.moderation.post.delete.description', {
                  defaultValue:
                    'You are about to delete this post, it will no longer be available in the community. Are you sure about this?',
                })
              : step === 'confirmProfile'
                ? t('admin.moderation.profile.delete.description', {
                    defaultValue:
                      'You are about to delete this profile. Are you sure about this?',
                  })
                : t('admin.moderation.report.close.description', {
                    defaultValue:
                      'You are about to close this report without performing an action on it which will mark it as resolved. Are you sure about this?',
                  })}
          </p>
        )}

        {error ? (
          <p className="border-error/40 text-error rounded-md border p-2 text-sm">
            {error}
          </p>
        ) : null}

        {step !== 'options' ? (
          <DialogFooter>
            <Button
              variant="variant-ringed-primary"
              action={() => setStep('options')}
              disabled={submitting}
            >
              {t('admin.moderation.report.close.cancel', {
                defaultValue: 'Back',
              })}
            </Button>
            <Button
              variant="variant-filled-error"
              action={() => {
                if (step === 'confirmClose') closeReport();
                else if (step === 'confirmPost' && firstPostId)
                  removeAndResolve(() => deletePost({ id: firstPostId }));
                else if (step === 'confirmProfile')
                  removeAndResolve(() =>
                    deleteProfile({ id: report.reportedProfile.id }),
                  );
              }}
              disabled={submitting}
            >
              {step === 'confirmClose'
                ? t('admin.moderation.report.close.confirm', {
                    defaultValue: 'Yes, close it',
                  })
                : t('admin.moderation.post.delete.confirm', {
                    defaultValue: 'Yes, delete it',
                  })}
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 text-sm ${active ? 'border-primary border-b-2 font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
    >
      {children}
    </button>
  );
}
