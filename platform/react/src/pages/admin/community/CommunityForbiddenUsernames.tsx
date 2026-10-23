import { useEffect, useState } from 'react';
import { Lock, X } from 'lucide-react';
import {
  classifyAdditionalForbiddenHandle,
  collectAdditionalForbiddenHandles,
  forbiddenHandles,
  normalizeForbiddenHandle,
  type CommunityConfig,
} from '@openpeepshq/common/types';
import { useT, useSetPageHeader, useOpenpeeps } from '../../../index';
import { Button, Input, Toast } from '@openpeepshq/react-ui';

const sameHandles = (left: readonly string[], right: readonly string[]) =>
  left.length === right.length &&
  left.every((handle, i) => handle === right[i]);

export function AdminConfigurationCommunityForbiddenUsernames() {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const configQuery = openpeepsApi.admin.useConfigRead(
    'openpeeps',
    'community',
  );
  const updateConfig = openpeepsApi.admin.updateConfigAction({
    namespace: 'openpeeps',
    name: 'community',
  });
  const [custom, setCustom] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useSetPageHeader(
    t('configuration.community.forbiddenUsernames.title', {
      defaultValue: 'Forbidden usernames',
    }),
  );

  const base = configQuery.data?.config as CommunityConfig | undefined;
  const saved = collectAdditionalForbiddenHandles(
    base?.settings?.additionalForbiddenHandles ?? [],
  ).handles;
  const savedKey = saved.join('\n');

  useEffect(() => {
    setCustom(savedKey ? savedKey.split('\n') : []);
  }, [savedKey]);

  const issueMessage = (
    issue: NonNullable<ReturnType<typeof classifyAdditionalForbiddenHandle>>,
  ) => {
    if (issue === 'empty') {
      return t('configuration.community.forbiddenUsernames.empty', {
        defaultValue: 'Enter a username to add.',
      });
    }
    if (issue === 'invalid') {
      return t('configuration.community.forbiddenUsernames.invalid', {
        defaultValue:
          'Usernames must be 1–16 characters: letters, numbers, underscores, or hyphens.',
      });
    }
    if (issue === 'builtIn') {
      return t('configuration.community.forbiddenUsernames.builtInError', {
        defaultValue:
          'Built-in usernames are always reserved and cannot be changed.',
      });
    }
    return t('configuration.community.forbiddenUsernames.duplicate', {
      defaultValue: 'That username is already on the list.',
    });
  };

  const addUsername = () => {
    const issue = classifyAdditionalForbiddenHandle(draft, custom);
    if (issue) {
      setFieldError(issueMessage(issue));
      return;
    }
    setCustom((prev) => [...prev, normalizeForbiddenHandle(draft)]);
    setDraft('');
    setFieldError(null);
  };

  const save = async () => {
    setStatus(null);
    setSaving(true);
    try {
      await updateConfig({
        config: { settings: { additionalForbiddenHandles: custom } },
      });
      setStatus({
        type: 'success',
        message: t('configuration.community.updateSuccess', {
          defaultValue: 'Community settings updated',
        }),
      });
    } catch (err) {
      setStatus({ type: 'error', message: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  if (configQuery.isLoading) {
    return (
      <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
        {t('common.form.loading', { defaultValue: 'Loading…' })}
      </div>
    );
  }

  return (
    <div
      className="flex flex-col gap-4 p-4"
      data-testid="admin-forbidden-usernames"
    >
      <p className="text-muted-foreground text-sm">
        {t('configuration.community.forbiddenUsernames.description', {
          defaultValue:
            'Block usernames your community does not allow, such as slurs or hate speech. Each entry is a full username, ignoring capitalization. Built-in usernames stay reserved and cannot be removed.',
        })}
      </p>
      <ul className="border-border divide-border divide-y border">
        {forbiddenHandles.map((handle) => (
          <li
            key={handle}
            className="flex items-center justify-between gap-3 px-3 py-2"
            data-testid={`admin-forbidden-username-${handle}`}
          >
            <span>{handle}</span>
            <span className="text-muted-foreground flex items-center gap-1 text-xs">
              <Lock className="size-3" aria-hidden="true" />
              {t('configuration.community.forbiddenUsernames.builtIn', {
                defaultValue: 'Built-in',
              })}
            </span>
          </li>
        ))}
        {custom.map((handle) => (
          <li
            key={handle}
            className="flex items-center justify-between gap-3 px-3 py-2"
            data-testid={`admin-forbidden-username-${handle}`}
          >
            <span>{handle}</span>
            <Button
              variant="ghost"
              title={t('configuration.community.forbiddenUsernames.remove', {
                defaultValue: 'Remove',
              })}
              action={() =>
                setCustom((prev) => prev.filter((item) => item !== handle))
              }
              data-testid={`admin-forbidden-username-remove-${handle}`}
            >
              <X className="size-4" aria-hidden="true" />
              {t('configuration.community.forbiddenUsernames.remove', {
                defaultValue: 'Remove',
              })}
            </Button>
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={draft}
            placeholder={t(
              'configuration.community.forbiddenUsernames.placeholder',
              { defaultValue: 'username' },
            )}
            aria-invalid={Boolean(fieldError)}
            onChange={(event) => {
              setDraft(event.target.value);
              setFieldError(null);
            }}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return;
              event.preventDefault();
              addUsername();
            }}
            data-testid="admin-forbidden-usernames-input"
          />
          <Button
            variant="outline"
            title={t('configuration.community.forbiddenUsernames.add', {
              defaultValue: 'Add username',
            })}
            action={addUsername}
            data-testid="admin-forbidden-usernames-add"
          >
            {t('configuration.community.forbiddenUsernames.add', {
              defaultValue: 'Add username',
            })}
          </Button>
        </div>
        {fieldError ? (
          <p className="text-error text-sm" role="alert">
            {fieldError}
          </p>
        ) : null}
      </div>
      {status ? (
        <Toast variant={status.type} onDismiss={() => setStatus(null)}>
          {status.message}
        </Toast>
      ) : null}
      <Button
        variant="default"
        action={save}
        disabled={saving || sameHandles(custom, saved)}
        data-testid="admin-forbidden-usernames-save"
      >
        {t('common.form.save', { defaultValue: 'Save' })}
      </Button>
    </div>
  );
}
