import { useState } from 'react';
import type { CommunityConfig } from '@openpeeps/common/types';
import { useT, useSetPageHeader } from '@openpeeps/react';
import { OpenpeepsMarkdown } from '@openpeeps/react/components';
import { Button, Textarea, Toast, deepGet, deepSet } from '@openpeeps/react-ui';
import { useCommunityConfig } from './useCommunityConfig';

export interface CommunityMarkdownPageProps {
  /** Config path to the markdown field, e.g. `['content', 'welcomePage']`. */
  path: ['content', keyof NonNullable<CommunityConfig['content']>];
  titleKey: string;
  descriptionKey: string;
}

export function CommunityMarkdownPage({
  path,
  titleKey,
  descriptionKey,
}: CommunityMarkdownPageProps) {
  const t = useT();
  const { isLoading, base, draft, save } = useCommunityConfig();
  const [content, setContent] = useState<string | null>(null);
  const [status, setStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useSetPageHeader(t(titleKey));

  const stored = base ? ((deepGet(base, path) as string) ?? '') : '';
  const value = content ?? stored;

  const handleSubmit = async () => {
    if (!draft) return;
    setStatus(null);
    deepSet(draft, path, value);
    try {
      await save(draft);
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
      <p className="pb-2 pt-4">{t(descriptionKey)}</p>
      <Textarea
        value={value}
        maxLength={5000}
        className="min-h-[30rem] font-mono text-sm"
        onChange={(e) => setContent(e.target.value)}
      />
      {value ? (
        <div className="border-t pt-3">
          <p className="text-muted-foreground mb-2 text-xs font-medium uppercase">
            {t('posts.form.preview', { defaultValue: 'Preview' })}
          </p>
          <OpenpeepsMarkdown source={value} linkPreviewMode="none" />
        </div>
      ) : null}
      <Button
        variant="variant-filled-primary"
        action={handleSubmit}
        title={t('configuration.community.save')}
      >
        {t('configuration.community.save')}
      </Button>
      {status ? (
        <Toast variant={status.type} onDismiss={() => setStatus(null)}>
          {status.message}
        </Toast>
      ) : null}
    </div>
  );
}
