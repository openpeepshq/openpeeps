import { useT, AVAILABLE_UI_LANGUAGES } from '../../index';
import { useLanguagePreference } from '../../hooks';
import { Button, Toast } from '@openpeepshq/react-ui';

const LANGUAGE_LABELS: Record<(typeof AVAILABLE_UI_LANGUAGES)[number], string> =
  {
    en: 'English',
    de: 'Deutsch',
  };

export function LanguageSettings() {
  const t = useT();
  const {
    profile,
    language,
    setLanguage,
    communityDefaultLanguage,
    saving,
    status,
    clearStatus,
    save,
  } = useLanguagePreference();

  if (!profile) return null;

  return (
    <div className="flex flex-col gap-4 p-3">
      <div className="border p-4">
        <h4 className="my-4 text-lg font-semibold">
          {t('settings.language.title', { defaultValue: 'Language' })}
        </h4>
        <span>
          {t('settings.language.languageDescription', {
            defaultValue: 'Choose your preferred language.',
          })}
        </span>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          {AVAILABLE_UI_LANGUAGES.map((code) => (
            <label key={code} className="flex items-center gap-2">
              <input
                type="radio"
                className="h-4 w-4"
                checked={language === code}
                onChange={() => setLanguage(code)}
              />
              <span>
                {LANGUAGE_LABELS[code]}
                {code === communityDefaultLanguage ? (
                  <span className="ml-1 text-sm opacity-60">
                    {t('settings.language.default', {
                      defaultValue: '(community default)',
                    })}
                  </span>
                ) : null}
              </span>
            </label>
          ))}
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
