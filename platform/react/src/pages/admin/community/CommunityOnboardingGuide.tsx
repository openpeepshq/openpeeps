import { useEffect, useState } from 'react';
import {
  ONBOARDING_RUNGS,
  resolveOnboardingGuideConfig,
  type OnboardingGuideConfig,
  type OnboardingRung,
} from '@openpeepshq/common';
import { useT, useSetPageHeader } from '../../../index';
import {
  Button,
  Checkbox,
  Input,
  Label,
  Switch,
  Textarea,
  Toast,
} from '@openpeepshq/react-ui';
import { useCommunityConfig } from './useCommunityConfig';

export function AdminConfigurationCommunityOnboardingGuide() {
  const t = useT();
  const { isLoading, draft, save } = useCommunityConfig();
  const [form, setForm] = useState<OnboardingGuideConfig>(
    resolveOnboardingGuideConfig(),
  );
  const [status, setStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useSetPageHeader(t('configuration.community.onboardingGuide.title'));

  useEffect(() => {
    if (draft) {
      setForm(resolveOnboardingGuideConfig(draft.onboardingGuide));
    }
  }, [draft]);

  const patch = (partial: Partial<OnboardingGuideConfig>) =>
    setForm((current) => ({ ...current, ...partial }));

  const toggleRung = (rung: OnboardingRung, checked: boolean) =>
    setForm((current) => ({
      ...current,
      enabledRungs: checked
        ? [...current.enabledRungs, rung]
        : current.enabledRungs.filter((item) => item !== rung),
    }));

  const onSubmit = async () => {
    if (!draft) return;
    setStatus(null);
    try {
      await save({ ...draft, onboardingGuide: form });
      setStatus({
        type: 'success',
        message: t('configuration.community.updateSuccess'),
      });
    } catch (err) {
      setStatus({ type: 'error', message: (err as Error).message });
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
      <Label
        title={t('configuration.community.onboardingGuide.enabled')}
        description={t(
          'configuration.community.onboardingGuide.enabledDescription',
        )}
      >
        <Switch
          checked={form.enabled}
          onCheckedChange={(checked) => patch({ enabled: checked })}
        />
      </Label>
      <Label title={t('configuration.community.onboardingGuide.displayName')}>
        <Input
          value={form.displayName}
          onChange={(event) => patch({ displayName: event.target.value })}
        />
      </Label>
      <Label title={t('configuration.community.onboardingGuide.subtitle')}>
        <Input
          value={form.subtitle}
          onChange={(event) => patch({ subtitle: event.target.value })}
        />
      </Label>
      <Label title={t('configuration.community.onboardingGuide.tone')}>
        <select
          className="op-input"
          value={form.tone}
          onChange={(event) =>
            patch({
              tone: event.target.value as OnboardingGuideConfig['tone'],
            })
          }
        >
          <option value="warm">
            {t('configuration.community.onboardingGuide.toneWarm')}
          </option>
          <option value="neutral">
            {t('configuration.community.onboardingGuide.toneNeutral')}
          </option>
          <option value="formal">
            {t('configuration.community.onboardingGuide.toneFormal')}
          </option>
        </select>
      </Label>
      <Label
        title={t('configuration.community.onboardingGuide.quietHoursStart')}
        description={t(
          'configuration.community.onboardingGuide.quietHoursDescription',
        )}
      >
        <Input
          type="number"
          min={0}
          max={23}
          value={form.quietHours.startHour}
          onChange={(event) =>
            patch({
              quietHours: {
                ...form.quietHours,
                startHour: Number(event.target.value),
              },
            })
          }
        />
      </Label>
      <Label title={t('configuration.community.onboardingGuide.quietHoursEnd')}>
        <Input
          type="number"
          min={0}
          max={23}
          value={form.quietHours.endHour}
          onChange={(event) =>
            patch({
              quietHours: {
                ...form.quietHours,
                endHour: Number(event.target.value),
              },
            })
          }
        />
      </Label>
      <Label title={t('configuration.community.onboardingGuide.windowDays')}>
        <Input
          type="number"
          min={1}
          max={90}
          value={form.windowDays}
          onChange={(event) =>
            patch({ windowDays: Number(event.target.value) })
          }
        />
      </Label>
      <Label title={t('configuration.community.onboardingGuide.maxPerDay')}>
        <Input
          type="number"
          min={0}
          max={10}
          value={form.maxProactiveDmsPerDay}
          onChange={(event) =>
            patch({ maxProactiveDmsPerDay: Number(event.target.value) })
          }
        />
      </Label>
      <Label title={t('configuration.community.onboardingGuide.maxInWindow')}>
        <Input
          type="number"
          min={0}
          max={20}
          value={form.maxProactiveDmsInWindow}
          onChange={(event) =>
            patch({ maxProactiveDmsInWindow: Number(event.target.value) })
          }
        />
      </Label>
      <Label
        title={t('configuration.community.onboardingGuide.pushOnFirstIntro')}
      >
        <Switch
          checked={form.pushOnFirstIntro}
          onCheckedChange={(checked) => patch({ pushOnFirstIntro: checked })}
        />
      </Label>
      <Label title={t('configuration.community.onboardingGuide.primaryInvite')}>
        <select
          className="op-input"
          value={form.primaryInvite}
          onChange={(event) =>
            patch({
              primaryInvite: event.target
                .value as OnboardingGuideConfig['primaryInvite'],
            })
          }
        >
          <option value="both">
            {t('configuration.community.onboardingGuide.primaryBoth')}
          </option>
          <option value="dock">
            {t('configuration.community.onboardingGuide.primaryDock')}
          </option>
          <option value="dm_only">
            {t('configuration.community.onboardingGuide.primaryDm')}
          </option>
        </select>
      </Label>
      <Label
        title={t('configuration.community.onboardingGuide.customHostBlurb')}
        description={t(
          'configuration.community.onboardingGuide.customHostBlurbDescription',
        )}
      >
        <Textarea
          value={form.customHostBlurb ?? ''}
          onChange={(event) =>
            patch({ customHostBlurb: event.target.value || undefined })
          }
        />
      </Label>
      <div>
        <p className="mb-2 text-sm font-medium">
          {t('configuration.community.onboardingGuide.enabledRungs')}
        </p>
        <div className="flex flex-col gap-2">
          {ONBOARDING_RUNGS.map((rung) => (
            <label key={rung} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.enabledRungs.includes(rung)}
                onCheckedChange={(checked) =>
                  toggleRung(rung, checked === true)
                }
              />
              {t(`configuration.community.onboardingGuide.rungs.${rung}`)}
            </label>
          ))}
        </div>
      </div>
      <Button
        type="button"
        variant="default"
        action={() => void onSubmit()}
        title={t('configuration.community.save')}
      >
        {t('configuration.community.save')}
      </Button>
      {status ? (
        <Toast
          variant={status.type}
          testId="admin-community-onboarding-guide-toast"
          onDismiss={() => setStatus(null)}
        >
          {status.message}
        </Toast>
      ) : null}
    </div>
  );
}
