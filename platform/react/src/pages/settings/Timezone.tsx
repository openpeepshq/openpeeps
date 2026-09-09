import { useEffect, useState } from 'react';
import { resolveTimeZone } from '@openpeepshq/common/lib';
import { useT, useOpenpeeps, useSetPageHeader } from '../../index';
import {
  TimeZoneSelect,
  useCurrentProfile,
  useServerInfo,
} from '../../components';
import { Button, Toast } from '@openpeepshq/react-ui';

export function TimezoneSettings() {
  const t = useT();
  const profile = useCurrentProfile();
  const serverInfo = useServerInfo();
  const { openpeepsApi } = useOpenpeeps();
  const settingsQuery = openpeepsApi.useCurrentProfileSettings();
  const updateSettings = openpeepsApi.updateCurrentProfileSettingsAction();

  const communityDefaultTimeZone = resolveTimeZone(
    undefined,
    serverInfo.communityConfig?.settings?.defaultTimeZone,
  );

  const [timeZone, setTimeZone] = useState(communityDefaultTimeZone);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useSetPageHeader(t('settings.timezone.title', { defaultValue: 'Timezone' }));

  useEffect(() => {
    setTimeZone(settingsQuery.data?.timeZone ?? communityDefaultTimeZone);
  }, [settingsQuery.data?.timeZone, communityDefaultTimeZone]);

  if (!profile) return null;

  const save = async () => {
    setStatus(null);
    setSaving(true);
    try {
      await updateSettings({ id: profile.id, timeZone });
      setStatus({
        type: 'success',
        message: t('settings.timezone.updateSuccess', {
          defaultValue: 'Timezone updated.',
        }),
      });
    } catch (err) {
      setStatus({
        type: 'error',
        message: (err as Error).message,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-3">
      <div className="border p-4">
        <h4 className="my-4 text-lg font-semibold">
          {t('settings.timezone.title', { defaultValue: 'Timezone' })}
        </h4>
        <span>
          {t('settings.timezone.timezoneDescription', {
            defaultValue:
              'Choose your timezone. If unset, the community timezone is used.',
          })}
        </span>
        <div className="mt-4">
          <TimeZoneSelect
            id="profile-timezone"
            value={timeZone}
            onChange={setTimeZone}
            optionLabel={(tz) =>
              tz === communityDefaultTimeZone
                ? `${tz} ${t('settings.timezone.communityDefault', {
                    defaultValue: '(community default)',
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
      <Button variant="default" action={save} disabled={saving}>
        {t('common.form.save', { defaultValue: 'Save' })}
      </Button>
    </div>
  );
}
