import { useState } from 'react';
import { FEED_FORMAT_OPTIONS } from '@openpeepshq/common';
import { useT, useSetPageHeader } from '../../index';
import { Button, Toast } from '@openpeepshq/react-ui';
import { useFeedFormatPreference } from '../../hooks';

export function FeedSettings() {
  const t = useT();
  const { me, format, setFormat, submitting, save } = useFeedFormatPreference();
  const [status, setStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useSetPageHeader(t('settings.feed.title', { defaultValue: 'Feed' }));

  if (!me) return null;

  const onSave = async () => {
    setStatus(null);
    try {
      await save();
      setStatus({
        type: 'success',
        message: t('settings.feed.updateSuccess', {
          defaultValue: 'Feed layout updated.',
        }),
      });
    } catch (err) {
      setStatus({ type: 'error', message: (err as Error).message });
    }
  };

  return (
    <div className="flex flex-col gap-4 p-3">
      <div className="border p-4">
        <h4 className="my-2 text-lg font-semibold">
          {t('settings.feed.title', { defaultValue: 'Feed' })}
        </h4>
        <span className="text-muted-foreground text-sm">
          {t('settings.feed.feedDescription', {
            defaultValue:
              'Threaded keeps replies under the original post. Linear lists each reply as its own item with a compact parent preview.',
          })}
        </span>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          {FEED_FORMAT_OPTIONS.map((option) => (
            <label key={option} className="inline-flex items-center gap-2">
              <input
                type="radio"
                className="h-4 w-4"
                name="feed-format"
                value={option}
                checked={format === option}
                onChange={() => setFormat(option)}
              />
              <span>
                {t(`feed.format.${option}`, {
                  defaultValue: option === 'threaded' ? 'Threaded' : 'Linear',
                })}
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
      <Button variant="default" action={onSave} disabled={submitting}>
        {submitting
          ? t('common.saving', { defaultValue: 'Saving…' })
          : t('common.save', { defaultValue: 'Save' })}
      </Button>
    </div>
  );
}
