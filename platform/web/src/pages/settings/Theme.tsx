import { useEffect, useState } from 'react';
import { THEME_OPTIONS, type ThemeOptions } from '@openpeeps/common';
import { useT, useOpenpeeps, useSetPageHeader } from '@openpeeps/react';
import { useCurrentProfile } from '@openpeeps/react/components';
import { Button } from '@openpeeps/react-ui';

export function ThemeSettings() {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const me = useCurrentProfile();
  const settingsQuery = openpeepsApi.useCurrentProfileSettings();
  const updateSettings = openpeepsApi.updateCurrentProfileSettingsAction();

  const [theme, setTheme] = useState<ThemeOptions | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  useSetPageHeader(t('settings.theme.title', { defaultValue: 'Theme' }));

  useEffect(() => {
    if (settingsQuery.data?.theme) setTheme(settingsQuery.data.theme);
  }, [settingsQuery.data]);

  if (!me) return null;

  const submit = async () => {
    setSubmitting(true);
    try {
      await updateSettings({ id: me.id, theme });
      window.location.reload();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-3">
      <div className="border p-4">
        <h4 className="my-2 text-lg font-semibold">
          {t('settings.theme.title', { defaultValue: 'Theme' })}
        </h4>
        <span className="text-sm text-muted-foreground">
          {t('settings.theme.themeDescription', {
            defaultValue: 'Choose how the application looks for you.',
          })}
        </span>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
          {THEME_OPTIONS.map((option) => (
            <label key={option} className="inline-flex items-center gap-2">
              <input
                type="radio"
                className="h-4 w-4"
                name="theme"
                value={option}
                checked={theme === option}
                onChange={() => setTheme(option)}
              />
              <span>
                {t(`settings.theme.${option}.mode`, { defaultValue: option })}
              </span>
            </label>
          ))}
        </div>
      </div>

      <Button
        title="Save"
        variant="variant-ghost-primary"
        action={submit}
        disabled={submitting}
      >
        {submitting
          ? t('common.saving', { defaultValue: 'Saving…' })
          : t('common.save', { defaultValue: 'Save' })}
      </Button>
    </div>
  );
}
