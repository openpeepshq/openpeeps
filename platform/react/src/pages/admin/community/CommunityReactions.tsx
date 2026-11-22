import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import {
  REACTION_TYPES,
  type CommunityConfig,
} from '@openpeepshq/common/types';
import { useT, useSetPageHeader, useOpenpeeps } from '../../../index';
import { Button, Input, Toast } from '@openpeepshq/react-ui';

/**
 * Manage the set of emojis members can attach to posts (feed and direct
 * messages). A saved list (`content.allowedReactions`) wins; "reset to
 * defaults" clears the override so the community falls back to the curated
 * default set.
 */
export function AdminConfigurationCommunityReactions() {
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

  useSetPageHeader(
    t('configuration.community.reactions.title', {
      defaultValue: 'Post reactions',
    }),
  );

  const base = configQuery.data?.config as CommunityConfig | undefined;
  const saved = (base?.content?.allowedReactions ?? []).filter(Boolean);
  const savedKey = saved.join('\n');
  const isCustom =
    saved.length > 0 && savedKey !== [...REACTION_TYPES].join('\n');

  const [custom, setCustom] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    setCustom(savedKey ? savedKey.split('\n') : []);
  }, [savedKey]);

  const addEmoji = () => {
    const value = draft.trim();
    if (!value) {
      setFieldError(
        t('configuration.community.reactions.empty', {
          defaultValue: 'Enter an emoji to add.',
        }),
      );
      return;
    }
    if (value.length > 32) {
      setFieldError(
        t('configuration.community.reactions.tooLong', {
          defaultValue: 'That emoji is too long.',
        }),
      );
      return;
    }
    if (custom.includes(value)) {
      setFieldError(
        t('configuration.community.reactions.duplicate', {
          defaultValue: 'That emoji is already on the list.',
        }),
      );
      return;
    }
    if (custom.length >= 64) {
      setFieldError(
        t('configuration.community.reactions.tooMany', {
          defaultValue: 'Use at most 64 emojis.',
        }),
      );
      return;
    }
    setCustom((prev) => [...prev, value]);
    setDraft('');
    setFieldError(null);
  };

  const save = async () => {
    setStatus(null);
    setSaving(true);
    try {
      await updateConfig({
        config: { content: { allowedReactions: custom } },
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

  const resetToDefaults = async () => {
    setCustom([]);
    setDraft('');
    setFieldError(null);
    setStatus(null);
    setSaving(true);
    try {
      // An empty list is the explicit "reset" value: it resolves to the
      // curated defaults at read time.
      await updateConfig({
        config: { content: { allowedReactions: [] } },
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
        {t('common.states.loading', { defaultValue: 'Loading…' })}
      </div>
    );
  }

  return (
    <div
      className="flex flex-col gap-4 p-4"
      data-testid="admin-community-reactions"
    >
      <p className="text-muted-foreground text-sm">
        {t('configuration.community.reactions.description', {
          defaultValue:
            'Choose which emojis members can attach to posts, in the feed and direct messages. Leave the list empty to use the default set.',
        })}
      </p>

      {isCustom ? (
        <p className="text-sm">
          {t('configuration.community.reactions.custom', {
            defaultValue: 'This community uses a custom reaction set.',
          })}
        </p>
      ) : (
        <p className="text-sm">
          {t('configuration.community.reactions.defaultsInUse', {
            defaultValue: 'Using the default reaction set:',
          })}{' '}
          <span className="text-base">{REACTION_TYPES.join(' ')}</span>
        </p>
      )}

      <ul className="border-border divide-border flex flex-wrap gap-1 divide-y border">
        {custom.length === 0 ? (
          <li className="text-muted-foreground px-3 py-2 text-sm">
            {t('configuration.community.reactions.emptyList', {
              defaultValue: 'No custom emojis added.',
            })}
          </li>
        ) : null}
        {custom.map((emoji) => (
          <li
            key={emoji}
            className="flex items-center justify-between gap-3 px-3 py-2"
            data-testid={`admin-community-reaction-${emoji}`}
          >
            <span className="text-lg">{emoji}</span>
            <Button
              variant="ghost"
              title={t('configuration.community.reactions.remove', {
                defaultValue: 'Remove',
              })}
              action={() =>
                setCustom((prev) => prev.filter((item) => item !== emoji))
              }
              data-testid={`admin-community-reaction-remove-${emoji}`}
            >
              <X className="size-4" aria-hidden="true" />
              {t('configuration.community.reactions.remove', {
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
            placeholder="🐰"
            aria-invalid={Boolean(fieldError)}
            onChange={(event) => {
              setDraft(event.target.value);
              setFieldError(null);
            }}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return;
              event.preventDefault();
              addEmoji();
            }}
            data-testid="admin-community-reactions-input"
          />
          <Button
            variant="outline"
            title={t('configuration.community.reactions.add', {
              defaultValue: 'Add emoji',
            })}
            action={addEmoji}
            data-testid="admin-community-reactions-add"
          >
            {t('configuration.community.reactions.add', {
              defaultValue: 'Add emoji',
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

      <div className="flex gap-2">
        <Button
          variant="default"
          action={save}
          disabled={saving}
          data-testid="admin-community-reactions-save"
        >
          {t('configuration.community.reactions.save', {
            defaultValue: 'Save reactions',
          })}
        </Button>
        <Button
          variant="outline"
          action={resetToDefaults}
          disabled={saving}
          data-testid="admin-community-reactions-reset"
        >
          {t('configuration.community.reactions.reset', {
            defaultValue: 'Reset to defaults',
          })}
        </Button>
      </div>
    </div>
  );
}
