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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Textarea,
  Toast,
} from '@openpeepshq/react-ui';
import { useCommunityConfig } from './useCommunityConfig';

export function AdminConfigurationCommunityInfo() {
  const t = useT();
  const { isLoading, draft, save } = useCommunityConfig();
  const [status, setStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useSetPageHeader(
    t('configuration.community.info.title', { defaultValue: 'Basic Info' }),
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
            name="info.name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('configuration.community.name')}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="text"
                    data-testid="admin-community-info-name"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="info.tagLine"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('configuration.community.tagline')}</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    data-testid="admin-community-info-tagline"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="info.contactEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('configuration.community.email')}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="email"
                    value={field.value ?? ''}
                    data-testid="admin-community-info-email"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="settings.robotsDisallow"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t('configuration.community.robotsDisallow', {
                    defaultValue: 'Blocked paths for search engines',
                  })}
                </FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    value={
                      Array.isArray(field.value) ? field.value.join('\n') : ''
                    }
                    onChange={(event) => {
                      const lines = event.target.value
                        .split('\n')
                        .map((line) => line.trim())
                        .filter(Boolean);
                      // Empty means "use the server default", not "block nothing";
                      // an explicit [] belongs in the raw config editor.
                      field.onChange(lines.length ? lines : undefined);
                    }}
                    rows={5}
                    placeholder="/admin"
                    data-testid="admin-community-info-robots"
                  />
                </FormControl>
                <FormDescription>
                  {t('configuration.community.robotsDisallowDescription', {
                    defaultValue:
                      'One path per line. Leave empty for the standard block list of logged-out surfaces.',
                  })}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="submit"
            variant="default"
            title={t('configuration.community.save')}
            loading={form.formState.isSubmitting}
            data-testid="admin-community-info-save"
          >
            {t('configuration.community.save')}
          </Button>
        </form>
      </Form>
      {status ? (
        <Toast
          variant={status.type}
          testId="admin-community-info-toast"
          onDismiss={() => setStatus(null)}
        >
          {status.message}
        </Toast>
      ) : null}
    </div>
  );
}
