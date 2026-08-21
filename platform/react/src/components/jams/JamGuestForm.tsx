import { useState } from 'react';
import type { GuestData } from '@openpeepshq/common/types';
import { profileName } from '@openpeepshq/common/lib';
import { Button, Input, Label } from '@openpeepshq/react-ui';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useT } from '../../i18n';
import { useServerInfo } from '../server-data/context';
import { useJamContext } from './JamContext';

export function JamGuestForm() {
  const t = useT();
  const serverInfo = useServerInfo();
  const { jamPost, jamEvent } = useJamContext();
  const { openpeepsApi } = useOpenpeeps();
  const guestPass = openpeepsApi.guestPassAction();

  const [guestData, setGuestData] = useState<GuestData>({
    displayName: '',
    email: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const termsLink =
    serverInfo.communityConfig?.info?.termsAndConditions ??
    '/docs/terms-and-conditions';

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await guestPass({
        ...guestData,
        resource: { type: 'jams', id: jamPost.id },
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex h-full w-full max-w-md items-center justify-center p-4">
      <div className="bg-surface w-full space-y-4 rounded-md border p-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold">
            {jamEvent.name} — {profileName(jamPost.profile)}
          </h2>
          <p className="text-muted-foreground mt-2 text-sm">
            {t('jams.lobby.guestIntro', {
              defaultValue: 'Enter your details to join as a guest.',
            })}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="guest-name">
            {t('jams.lobby.guestFullNameLabel', { defaultValue: 'Full name' })}
          </Label>
          <Input
            id="guest-name"
            value={guestData.displayName}
            onChange={(e) =>
              setGuestData((d) => ({ ...d, displayName: e.target.value }))
            }
            placeholder={t('jams.lobby.guestFullNamePlaceholder', {
              defaultValue: 'Your name',
            })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="guest-email">
            {t('jams.lobby.guestEmailLabel', { defaultValue: 'Email' })}
          </Label>
          <Input
            id="guest-email"
            type="email"
            value={guestData.email}
            onChange={(e) =>
              setGuestData((d) => ({ ...d, email: e.target.value }))
            }
            placeholder={t('jams.lobby.guestEmailPlaceholder', {
              defaultValue: 'you@example.com',
            })}
          />
        </div>

        <p className="text-muted-foreground text-sm">
          {t('jams.lobby.guestTermsAgreePrefix', {
            defaultValue: 'By continuing you agree to the',
          })}{' '}
          <a
            href={termsLink}
            className="anchor"
            target="_blank"
            rel="noreferrer"
          >
            {t('navigation.termsAndConditions', {
              defaultValue: 'terms and conditions',
            })}
          </a>
          .
        </p>

        {error ? (
          <p className="border-error/40 text-error rounded-md border p-2 text-sm">
            {error}
          </p>
        ) : null}

        <Button
          variant="default"
          action={submit}
          disabled={
            submitting ||
            !guestData.displayName.trim() ||
            !guestData.email.trim()
          }
          className="w-full"
        >
          {submitting
            ? t('common.submitting', { defaultValue: 'Submitting…' })
            : t('jams.lobby.guestContinue', { defaultValue: 'Continue' })}
        </Button>
      </div>
    </div>
  );
}
