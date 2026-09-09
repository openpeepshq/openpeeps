import { useEffect, useState } from 'react';
import type { CommunityConfig } from '@openpeepshq/common/types';
import { browserTimeZone } from '@openpeepshq/common/lib';
import { useT, useOpenpeeps, useSetPageHeader } from '../../index';
import { TimeZoneSelect } from '../../components';
import { Button, Toast } from '@openpeepshq/react-ui';

export function AdminConfigurationCommunityTimezone() {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const configQuery = openpeepsApi.admin.useConfigRead(
    'openpeeps',
    'community',
  );
  const updateConfig = openpeepsApi.admin.updateConfigAction({
    namespace: 'openpeeps',
    name: 'community',
  });

  const browserTz = browserTimeZone();
  const [selectedTimeZone, setSelectedTimeZone] = useState(browserTz);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useSetPageHeader(
    t('configuration.community.timezone.title', {
      defaultValue: 'Default Timezone',
    }),
  );

  const config = configQuery.data?.config as CommunityConfig | undefined;
  const defaults = configQuery.data?.defaults as CommunityConfig | undefined;
  const savedTimeZone =
    config?.settings?.defaultTimeZone ?? defaults?.settings?.defaultTimeZone;

  useEffect(() => {
    setSelectedTimeZone(savedTimeZone ?? browserTz);
  }, [savedTimeZone, browserTz]);

  const hasChanges = selectedTimeZone !== (savedTimeZone ?? '');

  const save = async () => {
    setStatus(null);
    setSaving(true);
    try {
      const base = (config ?? defaults ?? {}) as CommunityConfig;
      await updateConfig({
        config: {
          ...base,
          settings: {
            ...base.settings,
            defaultTimeZone: selectedTimeZone,
          },
        },
      });
      setStatus({
        type: 'success',
        message: t('configuration.community.timezone.updateSuccess', {
          defaultValue: 'Default timezone updated.',
        }),
      });
    } catch (err) {
      setStatus({ type: 'error', message: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  if (configQuery.isLoading) {
    return (
      <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
        {t('common.form.loading', { defaultValue: 'Loading…' })}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="border p-4">
        <h4 className="my-4 text-lg font-semibold">
          {t('configuration.community.timezone.title', {
            defaultValue: 'Default timezone',
          })}
        </h4>
        <span>
          {t('configuration.community.timezone.timezoneDescription', {
            defaultValue:
              "Choose the default timezone for the community. Members who have not set a personal timezone will use this. If unset, each member's browser timezone is used.",
          })}
        </span>
        <div className="mt-4">
          <TimeZoneSelect
            id="community-timezone"
            value={selectedTimeZone}
            onChange={setSelectedTimeZone}
            optionLabel={(tz) =>
              tz === browserTz
                ? `${tz} ${t('configuration.community.timezone.browser', {
                    defaultValue: '(browser)',
                  })}`
                : tz
            }
          />
        </div>
      </div>
      {status ? (
        <Toast variant={status.type} onDismiss={() => setStatus(null)}>
          {status.message}
        </Toast>
      ) : null}
      <Button variant="default" action={save} disabled={!hasChanges || saving}>
        {t('common.form.save', { defaultValue: 'Save' })}
      </Button>
    </div>
  );
}
