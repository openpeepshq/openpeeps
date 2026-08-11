import { useEffect, useState } from 'react';
import { useT, useOpenpeeps } from '../../index';
import { useCurrentProfile, useServerInfo } from '../../components';
import { Button, Toast } from '@openpeepshq/react-ui';

const AVAILABLE_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'de', name: 'Deutsch' },
] as const;

export function LanguageSettings() {
  const t = useT();
  const profile = useCurrentProfile();
  const serverInfo = useServerInfo();
  const { openpeepsApi } = useOpenpeeps();
  const settingsQuery = openpeepsApi.useCurrentProfileSettings();
  const updateSettings = openpeepsApi.updateCurrentProfileSettingsAction();

  const communityDefaultLanguage =
    serverInfo.communityConfig?.settings?.defaultLanguage ?? 'en';

  const [language, setLanguage] = useState(communityDefaultLanguage);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    if (settingsQuery.data?.language) {
      setLanguage(settingsQuery.data.language);
    }
  }, [settingsQuery.data?.language]);

  if (!profile) return null;

  const save = async () => {
    setStatus(null);
    setSaving(true);
    try {
      await updateSettings({ id: profile.id, language });
      localStorage.setItem('openpeeps-language', language);
      setStatus({
        type: 'success',
        message: t('settings.language.updateSuccess', {
          defaultValue: 'Language updated. Reloading…',
        }),
      });
      window.setTimeout(() => window.location.reload(), 500);
    } catch (err) {
      setStatus({ type: 'error', message: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

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
          {AVAILABLE_LANGUAGES.map((lang) => (
            <label key={lang.code} className="flex items-center gap-2">
              <input
                type="radio"
                className="h-4 w-4"
                checked={language === lang.code}
                onChange={() => setLanguage(lang.code)}
              />
              <span>
                {lang.name}
                {lang.code === communityDefaultLanguage ? (
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
