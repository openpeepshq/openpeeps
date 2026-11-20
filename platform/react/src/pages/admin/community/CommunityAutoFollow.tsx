import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  communityConfigSchema,
  type CommunityConfig,
  type PublicProfile,
} from '@openpeepshq/common/types';
import { useT, useSetPageHeader, useOpenpeeps } from '../../../index';
import { Avatar, ProfilesInput } from '../../../components';
import {
  Button,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Toast,
} from '@openpeepshq/react-ui';
import { useCommunityConfig } from './useCommunityConfig';

/**
 * Standalone category for `content.autoFollow` (moved out of Basic Info):
 * new members follow these local accounts when they sign up. Handles are
 * picked with the profile selector rather than typed, so the admin cannot
 * save a handle that does not exist on this instance.
 */
export function AdminConfigurationCommunityAutoFollow() {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const { isLoading, draft, save } = useCommunityConfig();
  const profilesQuery = openpeepsApi.useProfiles();
  const [status, setStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useSetPageHeader(
    t('configuration.community.autoFollow.title', {
      defaultValue: 'Auto-follow accounts',
    }),
  );

  const form = useForm<CommunityConfig>({
    resolver: zodResolver(communityConfigSchema),
    values: draft ?? undefined,
  });
  const storedHandles = form.watch('content.autoFollow') ?? [];

  const allProfiles = profilesQuery.data ?? [];
  const selected = useMemo(
    () =>
      storedHandles
        .map((handle) => allProfiles.find((p) => p.handle === handle))
        .filter((p): p is PublicProfile => Boolean(p)),
    [storedHandles, allProfiles],
  );
  const missing = useMemo(
    () =>
      storedHandles.filter(
        (handle) => !allProfiles.some((p) => p.handle === handle),
      ),
    [storedHandles, allProfiles],
  );

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
        {t('common.states.loading', { defaultValue: 'Loading…' })}
      </div>
    );
  }

  return (
    <div className="p-4">
      <Form {...form}>
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <FormField
            control={form.control}
            name="content.autoFollow"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t('configuration.community.autoFollow.field', {
                    defaultValue: 'Auto-follow accounts',
                  })}
                </FormLabel>
                <FormControl>
                  <ProfilesInput
                    value={selected}
                    onChange={(profiles) =>
                      field.onChange(profiles.map((p) => p.handle))
                    }
                    // Only local accounts are valid auto-follow targets —
                    // federated profiles would fail server-side validation.
                    filter={(p) => p.type === 'local'}
                    placeholder={t('profile.input.placeholder', {
                      defaultValue: 'Select profiles',
                    })}
                  />
                </FormControl>
                {missing.length > 0 ? (
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    {missing.map((handle) => (
                      <span
                        key={handle}
                        className="border-border bg-surface-2 text-muted-foreground flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs"
                      >
                        <Avatar profile={{ handle }} size={0.6} borderless />@
                        {handle}
                        <button
                          type="button"
                          className="hover:bg-secondary rounded-full p-0.5"
                          title={t('common.actions.remove', {
                            defaultValue: 'Remove',
                          })}
                          onClick={() =>
                            field.onChange(
                              storedHandles.filter((h) => h !== handle),
                            )
                          }
                        >
                          <X className="size-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : null}
                <FormDescription>
                  {t('configuration.community.autoFollow.fieldDescription', {
                    defaultValue:
                      'New members are made to follow these accounts when they sign up. Only local accounts can be designated.',
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
            data-testid="admin-community-autofollow-save"
          >
            {t('configuration.community.save')}
          </Button>
        </form>
      </Form>
      {status ? (
        <Toast
          variant={status.type}
          testId="admin-community-autofollow-toast"
          onDismiss={() => setStatus(null)}
        >
          {status.message}
        </Toast>
      ) : null}
    </div>
  );
}
