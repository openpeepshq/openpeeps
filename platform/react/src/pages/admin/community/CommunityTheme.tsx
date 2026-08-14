import { useEffect, useState } from 'react';
import type { CommunityConfig } from '@openpeepshq/common/types';
import { useT, useSetPageHeader, useOpenpeeps, equal } from '../../../index';
import { Button, ThemeFontSelect, Toast } from '@openpeepshq/react-ui';
import { useCommunityConfig } from './useCommunityConfig';

type Mode = 'light' | 'dark';

export function AdminConfigurationCommunityTheme() {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const { upload } = openpeepsApi.useMediaUpload();
  const { isLoading, base, save } = useCommunityConfig();
  const [cfg, setCfg] = useState<CommunityConfig | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useSetPageHeader(t('configuration.community.theme.title'));

  useEffect(() => {
    if (base) setCfg(structuredClone(base));
  }, [base]);

  const patch = (fn: (c: CommunityConfig) => void) =>
    setCfg((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      fn(next);
      return next;
    });

  const uploadInto = async (
    file: File,
    apply: (c: CommunityConfig, url: string) => void,
    usageKey: string,
  ) => {
    const attachment = await upload({ file, usage: t(usageKey) });
    if (attachment.url) patch((c) => apply(c, attachment.url ?? ''));
  };

  const handleSubmit = async () => {
    if (!cfg) return;
    setStatus(null);
    try {
      await save(cfg);
      window.location.reload();
    } catch (err) {
      setStatus((err as Error).message);
    }
  };

  if (isLoading || !cfg) {
    return (
      <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
        {t('common.form.loading', { defaultValue: 'Loading…' })}
      </div>
    );
  }

  const fileInput = (
    onChange: (file: File) => void,
    label: string,
    preview?: string,
    previewClass = 'h-[400px] w-full bg-contain bg-center bg-no-repeat',
  ) => (
    <div>
      <div
        className={previewClass}
        style={preview ? { backgroundImage: `url(${preview})` } : undefined}
      />
      <label className="border-primary mt-2 flex cursor-pointer items-center justify-center rounded border-2 border-dashed p-4 text-sm">
        {label}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void onChange(file);
            e.target.value = '';
          }}
        />
      </label>
    </div>
  );

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* theme mode */}
      <div className="border p-4">
        <h4 className="my-4 text-lg font-semibold">
          {t('configuration.community.theme.title')}
        </h4>
        <span>{t('configuration.community.themeDescription')}</span>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
          {(
            [
              ['OpenpeepsLight', 'configuration.community.lightTheme.mode'],
              ['OpenpeepsDark', 'configuration.community.darkTheme.mode'],
            ] as const
          ).map(([base, labelKey]) => (
            <label key={base} className="flex items-center gap-2">
              <input
                type="radio"
                className="h-4 w-4"
                checked={cfg.theme.base === base}
                onChange={() => patch((c) => (c.theme.base = base))}
              />
              <span>{t(labelKey)}</span>
            </label>
          ))}
        </div>
      </div>

      {/* primary color */}
      <div className="border p-4">
        <h4 className="my-4 text-lg font-semibold">
          {t('configuration.community.color')}
        </h4>
        <span>{t('configuration.community.colorDescription')}</span>
        <div className="mt-2 flex gap-x-4">
          {(['light', 'dark'] as Mode[]).map((mode) => (
            <div
              key={mode}
              className="flex flex-wrap items-center gap-x-4 gap-y-2"
            >
              <span className="mr-4">
                {t(`configuration.community.${mode}Theme.color`)}
              </span>
              <input
                className="!size-8 !rounded-full"
                type="color"
                value={cfg.theme[mode].primaryHex}
                onChange={(e) =>
                  patch((c) => (c.theme[mode].primaryHex = e.target.value))
                }
              />
              <input
                className="op-input w-32"
                type="text"
                value={cfg.theme[mode].primaryHex}
                readOnly
                tabIndex={-1}
              />
            </div>
          ))}
        </div>
      </div>

      {/* typography + radii */}
      <div className="border p-4">
        <h4 className="my-4 text-lg font-semibold">
          {t('configuration.community.typographyAndRadii')}
        </h4>
        <div className="mt-2 grid gap-4 sm:grid-cols-2">
          {(['light', 'dark'] as Mode[]).map((mode) => (
            <div key={mode} className="space-y-3">
              <div className="font-medium">
                {t(`configuration.community.${mode}Theme.color`)}
              </div>
              <label className="block text-sm">
                {t('configuration.community.fontFamily')}
                <ThemeFontSelect
                  className="op-input mt-1 w-full"
                  aria-label={t('configuration.community.fontFamily')}
                  value={cfg.theme[mode].fontFamily}
                  onChange={(fontFamily) =>
                    patch((c) => (c.theme[mode].fontFamily = fontFamily))
                  }
                />
              </label>
              <label className="block text-sm">
                {t('configuration.community.buttonRadius')}
                <input
                  className="op-input mt-1 w-full"
                  type="text"
                  placeholder="9999px"
                  value={cfg.theme[mode].buttonRadius ?? ''}
                  onChange={(e) =>
                    patch(
                      (c) =>
                        (c.theme[mode].buttonRadius =
                          e.target.value || undefined),
                    )
                  }
                />
              </label>
              <label className="block text-sm">
                {t('configuration.community.radius')}
                <input
                  className="op-input mt-1 w-full"
                  type="text"
                  placeholder="8px"
                  value={cfg.theme[mode].radius ?? ''}
                  onChange={(e) =>
                    patch(
                      (c) =>
                        (c.theme[mode].radius = e.target.value || undefined),
                    )
                  }
                />
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* auth background */}
      <div className="border p-4">
        <h4 className="my-4 text-lg font-semibold">
          {t('configuration.community.authBackground')}
        </h4>
        <span>{t('configuration.community.authBackgroundDescription')}</span>
        <div className="flex flex-wrap gap-x-4">
          {(['light', 'dark'] as Mode[]).map((mode) =>
            fileInput(
              (file) =>
                uploadInto(
                  file,
                  (c, url) => (c.theme[mode].backgroundAuth = url),
                  'configuration.community.backgroundAuth',
                ),
              t(`configuration.community.${mode}Theme.uploadAuthBackground`),
              cfg.theme[mode].backgroundAuth,
            ),
          )}
        </div>
        <p className="py-3 text-sm">
          {t('configuration.community.authBackgroundRequirements')}
        </p>
      </div>

      {/* background */}
      <div className="border p-4">
        <h4 className="my-4 text-lg font-semibold">
          {t('configuration.community.background')}
        </h4>
        <span>{t('configuration.community.backgroundDescription')}</span>
        <div className="flex flex-wrap gap-x-4">
          {(['light', 'dark'] as Mode[]).map((mode) =>
            fileInput(
              (file) =>
                uploadInto(
                  file,
                  (c, url) => (c.theme[mode].background = url),
                  'configuration.community.background',
                ),
              t(`configuration.community.${mode}Theme.uploadBackground`),
              cfg.theme[mode].background,
            ),
          )}
        </div>
        <p className="py-3 text-sm">
          {t('configuration.community.backgroundRequirements')}
        </p>
      </div>

      {/* logo */}
      <div className="border p-4">
        <h4 className="my-4 text-lg font-semibold">
          {t('configuration.community.logo')}
        </h4>
        <span>{t('configuration.community.logoDescription')}</span>
        <div className="flex flex-wrap gap-x-4">
          {(['light', 'dark'] as Mode[]).map((mode) => (
            <div key={mode}>
              <div className="mb-2 flex flex-wrap gap-x-6 gap-y-2">
                <img
                  className="h-20 object-contain"
                  alt={t('configuration.community.logo')}
                  src={cfg.theme[mode].logoSmall ?? '/img/logo-small.png'}
                />
              </div>
              {fileInput(
                (file) =>
                  uploadInto(
                    file,
                    (c, url) => (c.theme[mode].logoSmall = url),
                    'configuration.community.logo',
                  ),
                t(`configuration.community.${mode}Theme.uploadLogo`),
                undefined,
                'hidden',
              )}
            </div>
          ))}
        </div>
        <p className="py-3 text-sm">
          {t('configuration.community.logoRequirements')}
        </p>
      </div>

      <Button
        variant="default"
        action={handleSubmit}
        disabled={!base || equal(base, cfg)}
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
