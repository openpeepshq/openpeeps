import { AnalyticsInfoBadge, MetricCard } from '@openpeepshq/react-ui';
import type { ServerInfo } from '@openpeepshq/common/types';
import { PluginSlot } from '../../../components';
import { useT } from '../../../index';
import { formatBytes, formatUptime, usagePercent } from './serverStatusFormat';

const UsageBar = ({
  label,
  used,
  total,
  hint,
  info,
}: {
  label: string;
  used: number;
  total: number;
  hint?: string;
  info?: string;
}) => {
  const pct = usagePercent(used, total);
  return (
    <div className="relative rounded-md border p-4">
      {info ? (
        <div className="absolute right-3 top-3">
          <AnalyticsInfoBadge label={label} info={info} />
        </div>
      ) : null}
      <h3 className={`text-muted-foreground text-sm ${info ? 'pr-5' : ''}`}>
        {label}
      </h3>
      <p className="mt-1 text-lg font-semibold tabular-nums">
        {formatBytes(used)} / {formatBytes(total)}
      </p>
      <div className="bg-surface mt-3 h-2 overflow-hidden rounded-full">
        <div
          className="bg-primary h-full rounded-full"
          style={{ width: `${pct}%` }}
        />
      </div>
      {hint ? (
        <p className="text-muted-foreground mt-2 text-xs">{hint}</p>
      ) : null}
    </div>
  );
};

export const ServerStatusSection = ({ status }: { status: ServerInfo }) => {
  const t = useT();
  const { users, resources } = status;
  const diskUsed = resources.disk
    ? resources.disk.totalBytes - resources.disk.freeBytes
    : 0;
  const startedAt = new Date(status.startedAt).toLocaleString();
  const info = (key: string, defaultValue: string) =>
    t(`admin.overview.info.${key}`, { defaultValue });

  return (
    <section>
      <h2 className="mb-3 text-lg font-medium">
        {t('admin.overview.server', { defaultValue: 'Server' })}
      </h2>
      <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={t('admin.overview.users', { defaultValue: 'Users' })}
          value={users.accountCount}
          subtitle={t('admin.overview.usersHint', {
            defaultValue: '{{profiles}} profiles',
            profiles: users.profileCount.toLocaleString(),
          })}
          info={info(
            'users',
            'Accounts on this instance. The subtitle is the number of member profiles those accounts own.',
          )}
        />
        <MetricCard
          label={t('admin.overview.uptime', { defaultValue: 'Uptime' })}
          value={formatUptime(status.uptimeSeconds)}
          subtitle={t('admin.overview.startedAt', {
            defaultValue: 'Since {{when}}',
            when: startedAt,
          })}
          info={info(
            'uptime',
            'How long this API process has been running, measured from the last process start.',
          )}
        />
        <PluginSlot name="admin.overview.metrics" className="contents" />
      </div>

      {resources.disk ? (
        <>
          <h3 className="mb-3 mt-6 text-base font-medium">
            {t('admin.overview.resources', { defaultValue: 'Resources' })}
          </h3>
          <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <UsageBar
              label={t('admin.overview.mediaDisk', {
                defaultValue: 'Media storage',
              })}
              used={diskUsed}
              total={resources.disk.totalBytes}
              hint={resources.disk.path}
              info={info(
                'mediaDisk',
                'Free and used space on the filesystem that holds the media folder.',
              )}
            />
          </div>
        </>
      ) : null}
    </section>
  );
};
