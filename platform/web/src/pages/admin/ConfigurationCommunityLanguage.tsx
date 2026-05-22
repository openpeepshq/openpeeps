import { useEffect, useState } from 'react';
import type { CommunityConfig } from '@openpeeps/common/types';
import { useT, useOpenpeeps } from '@openpeeps/react';
import { Button } from '@openpeeps/react-ui';

const AVAILABLE_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'de', name: 'Deutsch' },
] as const;

const DEFAULT_LANGUAGE = 'en';

export function AdminConfigurationCommunityLanguage() {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const configQuery = openpeepsApi.admin.useConfigRead('openpeeps', 'community');
  const updateConfig = openpeepsApi.admin.updateConfigAction({
    namespace: 'openpeeps',
    name: 'community',
  });

  const [selectedLanguage, setSelectedLanguage] = useState(DEFAULT_LANGUAGE);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const config = configQuery.data?.config as CommunityConfig | undefined;
  const defaults = configQuery.data?.defaults as CommunityConfig | undefined;
  const currentDefault =
    config?.settings?.defaultLanguage ??
    defaults?.settings?.defaultLanguage ??
    DEFAULT_LANGUAGE;

  useEffect(() => {
    setSelectedLanguage(currentDefault);
  }, [currentDefault]);

  const hasChanges = selectedLanguage !== currentDefault;

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
            defaultLanguage: selectedLanguage,
          },
        },
      });
      setStatus(
        t('configuration.community.language.updateSuccess', {
          defaultValue: 'Default language updated.',
        }),
      );
    } catch (err) {
      setStatus((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (configQuery.isLoading) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
        {t('common.form.loading', { defaultValue: 'Loading…' })}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="border p-4">
        <h4 className="my-4 text-lg font-semibold">
          {t('configuration.community.language.title', {
            defaultValue: 'Default language',
          })}
        </h4>
        <span>
          {t('configuration.community.language.languageDescription', {
            defaultValue: 'Choose the default language for new members.',
          })}
        </span>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          {AVAILABLE_LANGUAGES.map((lang) => (
            <label key={lang.code} className="flex items-center gap-2">
              <input
                type="radio"
                className="h-4 w-4"
                checked={selectedLanguage === lang.code}
                onChange={() => setSelectedLanguage(lang.code)}
              />
              <span>
                {lang.name}
                {lang.code === DEFAULT_LANGUAGE ? (
                  <span className="ml-1 text-sm opacity-60">
                    {t('settings.language.default', { defaultValue: '(default)' })}
                  </span>
                ) : null}
              </span>
            </label>
          ))}
        </div>
      </div>
      {status ? <p className="text-sm">{status}</p> : null}
      <Button variant="default" action={save} disabled={!hasChanges || saving}>
        {t('common.form.save', { defaultValue: 'Save' })}
      </Button>
    </div>
  );
}
