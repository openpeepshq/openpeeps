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

const AutoFollowInput = ({
  value,
  onChange,
}: {
  value: string[] | undefined;
  onChange: (value: string[] | undefined) => void;
}) => {
  // Raw text is local state: re-parsing on every keystroke would eat the
  // comma in "alice," before it can be typed.
  const [text, setText] = useState(() => (value ?? []).join(', '));
  return (
    <Input
      type="text"
      value={text}
      onChange={(event) => {
        setText(event.target.value);
        const handles = event.target.value
          .split(',')
          .map((handle) => handle.trim())
          .filter(Boolean);
        onChange(handles.length ? handles : []);
      }}
      data-testid="admin-community-info-autofollow"
    />
  );
};

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
            name="content.autoFollow"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t('configuration.community.autoFollow', {
                    defaultValue: 'Auto-follow accounts',
                  })}
                </FormLabel>
                <FormControl>
                  <AutoFollowInput
                    value={field.value}
                    onChange={field.onChange}
                  />
                </FormControl>
                <FormDescription>
                  {t('configuration.community.autoFollowDescription', {
                    defaultValue:
                      'Comma-separated handles. New members follow these accounts when they sign up.',
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
