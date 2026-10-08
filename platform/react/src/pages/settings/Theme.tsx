import { THEME_OPTIONS } from '@openpeepshq/common';
import { useT, useSetPageHeader } from '../../index';
import { Button } from '@openpeepshq/react-ui';
import { useThemePreference } from '../../hooks';

export function ThemeSettings() {
  const t = useT();
  const { me, theme, setTheme, submitting, save } = useThemePreference();

  useSetPageHeader(t('settings.theme.title', { defaultValue: 'Theme' }));

  if (!me) return null;

  const submit = async () => {
    await save();
    window.location.reload();
  };

  return (
    <div className="flex flex-col gap-4 p-3">
      <div className="border p-4">
        <h4 className="my-2 text-lg font-semibold">
          {t('settings.theme.title', { defaultValue: 'Theme' })}
        </h4>
        <span className="text-muted-foreground text-sm">
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
        variant="default"
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
