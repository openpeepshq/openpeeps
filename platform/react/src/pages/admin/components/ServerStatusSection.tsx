import { MetricCard } from '@openpeepshq/react-ui';
import type { ServerInfo } from '@openpeepshq/common/types';
import { useT } from '../../../index';
import { formatBytes, formatUptime } from './serverStatusFormat';

export const ServerStatusSection = ({
  status,
  jobsLast24h,
  emailsLast24h,
}: {
  status: ServerInfo;
  jobsLast24h: number;
  emailsLast24h: number;
}) => {
  const t = useT();
  const info = (key: string, defaultValue: string) =>
    t(`admin.overview.info.${key}`, { defaultValue });
  const startedAt = status.startedAt
    ? new Date(status.startedAt).toLocaleString()
    : '';
  const last24h = t('admin.overview.last24h', {
    defaultValue: 'Last 24 hours',
  });
  const versionSubtitle = [
    status.build
      ? t('admin.overview.build', {
          defaultValue: 'Build {{build}}',
          build: status.build,
        })
      : null,
    status.environment,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <section>
      <h2 className="mb-3 text-lg font-medium">
        {t('admin.overview.server', { defaultValue: 'Server' })}
      </h2>
      <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          className="overflow-visible sm:col-span-2"
          label={t('admin.overview.communityName', {
            defaultValue: 'Community Name',
          })}
          value={status.communityConfig.info.name ?? ''}
          info={info('communityName', 'Display name from community settings.')}
        />
        <MetricCard
          className="overflow-visible sm:col-span-2"
          label={t('admin.overview.serverVersion', {
            defaultValue: 'Server Version',
          })}
          value={status.version}
          subtitle={versionSubtitle || undefined}
          info={info(
            'serverVersion',
            'Running OpenPeeps version. Build is set when the image was produced with a BUILD identifier.',
          )}
        />
        <MetricCard
          label={t('admin.overview.uptime', { defaultValue: 'Uptime' })}
          value={formatUptime(status.uptimeSeconds ?? 0)}
          subtitle={
            startedAt
              ? t('admin.overview.startedAt', {
                  defaultValue: 'Since {{when}}',
                  when: startedAt,
                })
              : undefined
          }
          info={info('uptime', 'Time since this server process started.')}
        />
        <MetricCard
          label={t('admin.overview.mediaDisk', {
            defaultValue: 'Media storage',
          })}
          value={
            status.disk
              ? formatBytes(status.disk.folderBytes)
              : t('admin.overview.mediaDiskUnavailable', {
                  defaultValue: 'Unavailable',
                })
          }
          subtitle={
            status.disk
              ? t('admin.overview.mediaDiskFree', {
                  defaultValue: '{{free}} free on disk',
                  free: formatBytes(status.disk.freeBytes),
                })
              : undefined
          }
          info={info(
            status.disk ? 'mediaDisk' : 'mediaDiskUnavailable',
            status.disk
              ? 'Size of files in the local media folder, and remaining space on that disk.'
              : 'Media storage path could not be read (missing folder or remote storage).',
          )}
        />
        <MetricCard
          label={t('admin.overview.jobsLast24h', {
            defaultValue: 'Jobs',
          })}
          value={jobsLast24h}
          subtitle={last24h}
          info={info(
            'jobsLast24h',
            'BullMQ jobs completed in the last 24 hours across all queues.',
          )}
        />
        <MetricCard
          label={t('admin.overview.emailsLast24h', {
            defaultValue: 'Emails sent',
          })}
          value={emailsLast24h}
          subtitle={last24h}
          info={info(
            'emailsLast24h',
            'Emails successfully sent by the send-email queue in the last 24 hours.',
          )}
        />
      </div>
    </section>
  );
};
