import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  communityConfigSchema,
  type CommunityConfig,
} from '@openpeepshq/common/types';
import { useT, useSetPageHeader } from '../../../index';
import {
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Toast,
} from '@openpeepshq/react-ui';
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

  const form = useForm<CommunityConfig>({
    resolver: zodResolver(communityConfigSchema),
    values: draft ?? undefined,
  });

  const onSubmit = form.handleSubmit(async (data) => {
    setStatus(null);
    try {
      await save(data);
      setStatus({
        type: 'success',
        message: t('configuration.community.updateSuccess'),
      });
    } catch (err) {
      setStatus({ type: 'error', message: (err as Error).message });
    }
  });

  if (isLoading || !draft) {
    return (
      <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
        {t('common.form.loading', { defaultValue: 'Loading…' })}
      </div>
    );
  }

  return (
    <div className="p-4">
      <Form {...form}>
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <FormField
            control={form.control}
            name="info.privacyPolicy"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t('configuration.community.privacyPolicy')}
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="text"
                    value={field.value ?? ''}
                    data-testid="admin-community-links-privacy"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="info.termsAndConditions"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t('configuration.community.termsAndConditions')}
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="text"
                    value={field.value ?? ''}
                    data-testid="admin-community-links-terms"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="submit"
            variant="default"
            title={t('configuration.community.save')}
            loading={form.formState.isSubmitting}
            data-testid="admin-community-links-save"
          >
            {t('configuration.community.save')}
          </Button>
        </form>
      </Form>
      {status ? (
        <Toast
          variant={status.type}
          testId="admin-community-links-toast"
          onDismiss={() => setStatus(null)}
        >
          {status.message}
        </Toast>
      ) : null}
    </div>
  );
}
