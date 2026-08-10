import { useState } from 'react';
import { communityConfigSchema } from '@openpeepshq/common/types';
import { useT, useSetPageHeader } from '@openpeepshq/react';
import { Button, Form, FormInput, Toast } from '@openpeepshq/react-ui';
import { useCommunityConfig } from './useCommunityConfig';

export function AdminConfigurationCommunityLinks() {
  const t = useT();
  const { isLoading, draft, save } = useCommunityConfig();
  const [status, setStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useSetPageHeader(
    t('configuration.community.links.title', { defaultValue: 'Policy Links' }),
  );

  const handleSubmit = async () => {
    if (!draft) return;
    setStatus(null);
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
    <div className="p-4">
      <Form
        data={draft}
        schema={communityConfigSchema as never}
        onSubmit={handleSubmit}
      >
        <FormInput
          path={['info', 'privacyPolicy']}
          type="text"
          title={t('configuration.community.privacyPolicy')}
        />
        <FormInput
          path={['info', 'termsAndConditions']}
          type="text"
          title={t('configuration.community.termsAndConditions')}
        />
        <Button
          variant="variant-filled-primary"
          action={handleSubmit}
          title={t('configuration.community.save')}
        >
          {t('configuration.community.save')}
        </Button>
      </Form>
      {status ? (
        <Toast variant={status.type} onDismiss={() => setStatus(null)}>
          {status.message}
        </Toast>
      ) : null}
    </div>
  );
}
