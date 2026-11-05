import { useEffect, useState } from 'react';
import { useT, useSetPageHeader } from '../../index';
import { Button, Toast } from '@openpeepshq/react-ui';
import { useCommunityConfig } from './community/useCommunityConfig';

const LANDING_PAGE_OPTIONS = ['localFeed', 'welcome'] as const;
type LandingPage = (typeof LANDING_PAGE_OPTIONS)[number];

export function AdminConfigurationCommunityLanding() {
  const t = useT();
  const { isLoading, base, draft, save } = useCommunityConfig();
  const [selected, setSelected] = useState<LandingPage>('localFeed');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useSetPageHeader(
    t('configuration.community.landingPage.title', {
      defaultValue: 'Landing page',
    }),
  );

  const current: LandingPage = base?.settings?.landingPage ?? 'localFeed';

  useEffect(() => {
    setSelected(current);
  }, [current]);

  const hasChanges = selected !== current;

  const saveLanding = async () => {
    if (!draft) return;
    setStatus(null);
    setSaving(true);
    try {
      await save({
        ...draft,
        settings: { ...draft.settings, landingPage: selected },
      });
      setStatus({
        type: 'success',
        message: t('configuration.community.landingPage.updateSuccess', {
          defaultValue: 'Landing page updated.',
        }),
      });
    } catch (err) {
      setStatus({ type: 'error', message: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || !draft) {
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
          {t('configuration.community.landingPage.title', {
            defaultValue: 'Landing page',
          })}
        </h4>
        <span>
          {t('configuration.community.landingPage.description', {
            defaultValue: 'The page members land on after logging in.',
          })}
        </span>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          {LANDING_PAGE_OPTIONS.map((option) => (
            <label key={option} className="flex items-center gap-2">
              <input
                type="radio"
                className="h-4 w-4"
                checked={selected === option}
                onChange={() => setSelected(option)}
              />
              <span>
                {t(`configuration.community.landingPage.${option}`, {
                  defaultValue:
                    option === 'localFeed' ? 'Community feed' : 'Welcome page',
                })}
                {option === 'localFeed' ? (
                  <span className="ml-1 text-sm opacity-60">
                    {t('settings.language.default', {
                      defaultValue: '(default)',
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
      <Button
        variant="default"
        action={saveLanding}
        disabled={!hasChanges || saving}
        data-testid="admin-community-landing-save"
      >
        {t('common.form.save', { defaultValue: 'Save' })}
      </Button>
    </div>
  );
}
