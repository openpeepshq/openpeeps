import { MetricCard } from '@openpeepshq/react-ui';
import type { AdminServerStatus } from '@openpeepshq/common/types';
import { useT } from '../../../index';
import { formatBytes, formatUptime, usagePercent } from './serverStatusFormat';

const UsageBar = ({
  label,
  used,
  total,
  hint,
}: {
  label: string;
  used: number;
  total: number;
  hint?: string;
}) => {
  const pct = usagePercent(used, total);
  return (
    <div className="rounded-md border p-4">
      <h3 className="text-muted-foreground text-sm">{label}</h3>
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

export const ServerStatusSection = ({
  status,
}: {
  status: AdminServerStatus;
}) => {
  const t = useT();
  const { subscription, resources } = status;
  const systemUsed =
    resources.systemMemory.totalBytes - resources.systemMemory.freeBytes;
  const diskUsed = resources.disk
    ? resources.disk.totalBytes - resources.disk.freeBytes
    : 0;
  const plan =
    subscription.plan ??
    t('admin.overview.selfHosted', { defaultValue: 'Self-hosted' });
  const seats =
    subscription.maxProfiles == null
      ? t('admin.overview.unlimitedSeats', {
          defaultValue: 'Unlimited profiles',
        })
      : t('admin.overview.seatsUsed', {
          defaultValue: '{{used}} of {{limit}} profiles',
          used: subscription.profileCount.toLocaleString(),
          limit: subscription.maxProfiles.toLocaleString(),
        });
  const startedAt = new Date(status.startedAt).toLocaleString();

  return (
    <section>
      <h2 className="mb-3 text-lg font-medium">
        {t('admin.overview.server', { defaultValue: 'Server' })}
      </h2>
      <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={t('admin.overview.version', {
            defaultValue: 'AllPeep version',
          })}
          value={status.version}
          subtitle={[
            status.build
              ? t('admin.overview.build', {
                  defaultValue: 'Build {{build}}',
                  build: status.build,
                })
              : null,
            status.environment,
          ]
            .filter(Boolean)
            .join(' · ')}
        />
        <MetricCard
          label={t('admin.overview.subscription', {
            defaultValue: 'AllPeep subscription',
          })}
          value={plan}
          subtitle={seats}
        />
        <MetricCard
          label={t('admin.overview.users', { defaultValue: 'Users' })}
          value={subscription.accountCount}
          subtitle={t('admin.overview.usersHint', {
            defaultValue: '{{profiles}} profiles',
            profiles: subscription.profileCount.toLocaleString(),
          })}
        />
        <MetricCard
          label={t('admin.overview.uptime', { defaultValue: 'Uptime' })}
          value={formatUptime(status.uptimeSeconds)}
          subtitle={t('admin.overview.startedAt', {
            defaultValue: 'Since {{when}}',
            when: startedAt,
          })}
        />
      </div>

      <h3 className="mb-3 mt-6 text-base font-medium">
        {t('admin.overview.resources', { defaultValue: 'Resources' })}
      </h3>
      <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <UsageBar
          label={t('admin.overview.memory', { defaultValue: 'Memory' })}
          used={systemUsed}
          total={resources.systemMemory.totalBytes}
          hint={t('admin.overview.processMemory', {
            defaultValue: 'Process {{rss}} (heap {{heap}})',
            rss: formatBytes(resources.processMemory.rssBytes),
            heap: formatBytes(resources.processMemory.heapUsedBytes),
          })}
        />
        {resources.disk ? (
          <UsageBar
            label={t('admin.overview.disk', { defaultValue: 'Disk' })}
            used={diskUsed}
            total={resources.disk.totalBytes}
            hint={resources.disk.path}
          />
        ) : null}
        <div className="rounded-md border p-4">
          <h3 className="text-muted-foreground text-sm">
            {t('admin.overview.loadAverage', { defaultValue: 'Load average' })}
          </h3>
          <p className="mt-1 text-lg font-semibold tabular-nums">
            {resources.loadAverage.map((n) => n.toFixed(2)).join(' / ')}
          </p>
          <p className="text-muted-foreground mt-2 text-xs">
            {t('admin.overview.loadAverageHint', {
              defaultValue: '1 / 5 / 15 min',
            })}
          </p>
        </div>
      </div>
    </section>
  );
};
