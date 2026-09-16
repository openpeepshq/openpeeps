import { useEffect, useState } from 'react';
import type { CommunityConfig } from '@openpeepshq/common/types';
import {
  DEFAULT_FEED_FORMAT,
  FEED_FORMAT_OPTIONS,
  type FeedFormat,
} from '@openpeepshq/common';
import { useT, useOpenpeeps, useSetPageHeader } from '../../index';
import { Button, Toast } from '@openpeepshq/react-ui';

export function AdminConfigurationCommunityFeed() {
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

  const [selectedFormat, setSelectedFormat] =
    useState<FeedFormat>(DEFAULT_FEED_FORMAT);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useSetPageHeader(
    t('configuration.community.feed.title', {
      defaultValue: 'Default feed layout',
    }),
  );

  const config = configQuery.data?.config as CommunityConfig | undefined;
  const defaults = configQuery.data?.defaults as CommunityConfig | undefined;
  const currentDefault =
    config?.settings?.defaultFeedFormat ??
    defaults?.settings?.defaultFeedFormat ??
    DEFAULT_FEED_FORMAT;

  useEffect(() => {
    setSelectedFormat(currentDefault);
  }, [currentDefault]);

  const hasChanges = selectedFormat !== currentDefault;

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
            defaultFeedFormat: selectedFormat,
          },
        },
      });
      setStatus({
        type: 'success',
        message: t('configuration.community.feed.updateSuccess', {
          defaultValue: 'Default feed layout updated.',
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
          {t('configuration.community.feed.title', {
            defaultValue: 'Default feed layout',
          })}
        </h4>
        <span>
          {t('configuration.community.feed.feedDescription', {
            defaultValue:
              'Choose the default layout for community feeds. Members can override this in their settings.',
          })}
        </span>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          {FEED_FORMAT_OPTIONS.map((option) => (
            <label key={option} className="flex items-center gap-2">
              <input
                type="radio"
                className="h-4 w-4"
                checked={selectedFormat === option}
                onChange={() => setSelectedFormat(option)}
              />
              <span>
                {t(`feed.format.${option}`, {
                  defaultValue: option === 'threaded' ? 'Threaded' : 'Linear',
                })}
                {option === DEFAULT_FEED_FORMAT ? (
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
      <Button variant="default" action={save} disabled={!hasChanges || saving}>
        {t('common.form.save', { defaultValue: 'Save' })}
      </Button>
    </div>
  );
}
