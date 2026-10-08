import { useT, useSetPageHeader } from '../../index';
import { TimeZoneSelect } from '../../components';
import { useTimezonePreference } from '../../hooks';
import { Button, Toast } from '@openpeepshq/react-ui';

export function TimezoneSettings() {
  const t = useT();
  const {
    profile,
    timeZone,
    setTimeZone,
    communityDefaultTimeZone,
    saving,
    status,
    clearStatus,
    save,
  } = useTimezonePreference();

  useSetPageHeader(t('settings.timezone.title', { defaultValue: 'Timezone' }));

  if (!profile) return null;

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
        <Toast variant={status.type} onDismiss={clearStatus}>
          {status.message}
        </Toast>
      ) : null}
      <Button variant="default" action={save} disabled={saving}>
        {t('common.form.save', { defaultValue: 'Save' })}
      </Button>
    </div>
  );
}
