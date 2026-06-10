import { useRef, useState } from 'react';
import { useT, useSetPageHeader, useOpenpeeps } from '@openpeeps/react';
import { Button, Toast } from '@openpeeps/react-ui';
import { useCommunityConfig } from './useCommunityConfig';

export function AdminConfigurationCommunityFavicons() {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const { upload } = openpeepsApi.useMediaUpload();
  const { isLoading, base, draft, save } = useCommunityConfig();
  const [icon, setIcon] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useSetPageHeader('Community Customization - Favicons');

  const currentIcon = icon ?? base?.theme?.icon ?? '/pwa/icons/128x128.png';

  const onPick = async (file: File) => {
    const attachment = await upload({
      file,
      usage: t('configuration.community.icon'),
    });
    if (attachment.url) setIcon(attachment.url);
  };

  const handleSubmit = async () => {
    if (!draft) return;
    setStatus(null);
    if (icon) draft.theme.icon = icon;
    try {
      await save(draft);
      window.location.reload();
    } catch (err) {
      setStatus((err as Error).message);
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
    <div className="relative mb-20 h-full w-full p-4">
      <p>{t('configuration.community.favicons.title')}</p>
      <div className="border p-4">
        <h4 className="my-4">
          {t('configuration.community.favicons.description')}
        </h4>
        <div className="mb-2 flex gap-x-6">
          <span>{t('configuration.community.currentIcon')}:</span>
          <img
            className="size-8"
            alt={t('configuration.community.icon')}
            src={currentIcon}
          />
        </div>
        <Button
          variant="variant-ringed-surface"
          action={() => inputRef.current?.click()}
          title={t('configuration.community.upload')}
        >
          {t('configuration.community.upload')}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void onPick(file);
            e.target.value = '';
          }}
        />
        <p className="py-3 text-sm">
          {t('configuration.community.iconRequirements')}
        </p>
      </div>
      <Button
        variant="variant-ghost-primary"
        className="mt-4 w-full"
        action={handleSubmit}
        title={t('configuration.community.save')}
      >
        {t('configuration.community.save')}
      </Button>
      {status ? (
        <Toast variant="error" onDismiss={() => setStatus(null)}>
          {status}
        </Toast>
      ) : null}
    </div>
  );
}
