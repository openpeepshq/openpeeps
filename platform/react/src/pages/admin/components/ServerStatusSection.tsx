import { MetricCard } from '@openpeepshq/react-ui';
import type { HostResourceStats, ServerInfo } from '@openpeepshq/common/types';
import { useT } from '../../../index';
import { formatBytes, formatUptime, usagePercent } from './serverStatusFormat';

export const ServerStatusSection = ({
  status,
  host,
}: {
  status: ServerInfo;
  host: HostResourceStats;
}) => {
  const t = useT();
  const info = (key: string, defaultValue: string) =>
    t(`admin.overview.info.${key}`, { defaultValue });
  const startedAt = status.startedAt
    ? new Date(status.startedAt).toLocaleString()
    : '';
  const percentFilled = (percent: number) =>
    t('admin.overview.percentFilled', {
      defaultValue: '{{percent}}%',
      percent: Math.round(percent),
    });
  const memoryAvailable = host.memoryTotalBytes > 0;
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
          label={t('admin.overview.memoryUsed', {
            defaultValue: 'Memory',
          })}
          value={
            memoryAvailable
              ? percentFilled(
                  usagePercent(host.memoryUsedBytes, host.memoryTotalBytes),
                )
              : t('admin.overview.mediaDiskUnavailable', {
                  defaultValue: 'Unavailable',
                })
          }
          subtitle={
            memoryAvailable
              ? t('admin.overview.memoryUsedOf', {
                  defaultValue: '{{used}} of {{total}}',
                  used: formatBytes(host.memoryUsedBytes),
                  total: formatBytes(host.memoryTotalBytes),
                })
              : undefined
          }
          info={info('memoryUsed', 'Share of host RAM currently in use.')}
        />
        <MetricCard
          label={t('admin.overview.cpuUsed', { defaultValue: 'CPU' })}
          value={percentFilled(host.cpuUsedPercent)}
          info={info('cpuUsed', 'Share of host CPU currently in use.')}
        />
      </div>
    </section>
  );
};
