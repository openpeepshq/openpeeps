import { MetricCard } from '@openpeepshq/react-ui';
import type { ServerInfo } from '@openpeepshq/common/types';
import { useT } from '../../../index';
import { formatBytes, formatUptime, usagePercent } from './serverStatusFormat';

export const ServerStatusSection = ({ status }: { status: ServerInfo }) => {
  const t = useT();
  const info = (key: string, defaultValue: string) =>
    t(`admin.overview.info.${key}`, { defaultValue });
  const startedAt = status.startedAt
    ? new Date(status.startedAt).toLocaleString()
    : '';
  const diskUsed = status.disk
    ? status.disk.totalBytes - status.disk.freeBytes
    : 0;
  const diskPct = status.disk
    ? usagePercent(diskUsed, status.disk.totalBytes)
    : 0;
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
          label={t('admin.overview.communityName', {
            defaultValue: 'Community Name',
          })}
          value={status.communityConfig.info.name ?? ''}
          info={info('communityName', 'Display name from community settings.')}
        />
        <MetricCard
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
            defaultValue: 'Media disk',
          })}
          value={
            status.disk
              ? `${formatBytes(diskUsed)} / ${formatBytes(status.disk.totalBytes)}`
              : t('admin.overview.mediaDiskUnavailable', {
                  defaultValue: 'Unavailable',
                })
          }
          subtitle={
            status.disk
              ? t('admin.overview.mediaDiskUsed', {
                  defaultValue: '{{percent}}% used',
                  percent: Math.round(diskPct),
                })
              : undefined
          }
          info={info(
            status.disk ? 'mediaDisk' : 'mediaDiskUnavailable',
            status.disk
              ? 'Filesystem usage of the folder that stores uploaded media.'
              : 'Media storage path could not be read (missing folder or remote storage).',
          )}
        />
      </div>
    </section>
  );
};
