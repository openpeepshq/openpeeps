import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { GroupData } from '@openpeeps/common/types';
import { groupCapabilityTemplates } from '@openpeeps/common/lib';
import { useT, useOpenpeeps } from '@openpeeps/react';
import { useServerInfo } from '@openpeeps/react/components';
import { Button, Input, Label, Textarea } from '@openpeeps/react-ui';

export function NewGroup() {
  const t = useT();
  const navigate = useNavigate();
  const { openpeepsApi } = useOpenpeeps();
  const createGroup = openpeepsApi.createGroupAction();
  const { publicContent } = useServerInfo();

  const [groupData, setGroupData] = useState<GroupData>(() => ({
    displayName: '',
    handle: '',
    description: '',
    rules: '',
    capabilities: publicContent
      ? groupCapabilityTemplates.defaultGroup.capabilities
      : groupCapabilityTemplates.defaultGroupClosedCommunity.capabilities,
  }));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    let data = groupData;
    if (data.handle.length === 0) {
      if (!data.displayName) {
        setError(
          t('handle.validation.error', {
            defaultValue: 'A handle or display name is required',
          }),
        );
        return;
      }
      data = {
        ...data,
        handle: data
          .displayName!.toLowerCase()
          .replaceAll(' ', '_')
          .replace(/[^a-zA-Z0-9_]/g, '')
          .trim()
          .slice(0, 16),
      };
    }
    setSubmitting(true);
    try {
      const group = (await createGroup(data)) as { handle: string };
      navigate(`/groups/@${group.handle}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 p-4 pb-12">
      <h1 className="text-2xl font-semibold">
        {t('groups.new.title', { defaultValue: 'Create group' })}
      </h1>

      <div className="space-y-2">
        <Label htmlFor="displayName">
          {t('groups.form.displayName', { defaultValue: 'Display name' })}
        </Label>
        <Input
          id="displayName"
          value={groupData.displayName ?? ''}
          onChange={(e) =>
            setGroupData((g) => ({ ...g, displayName: e.target.value }))
          }
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="handle">
          {t('groups.form.handle', { defaultValue: 'Handle' })}
        </Label>
        <Input
          id="handle"
          value={groupData.handle}
          onChange={(e) =>
            setGroupData((g) => ({ ...g, handle: e.target.value }))
          }
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">
          {t('groups.form.description', { defaultValue: 'Description' })}
        </Label>
        <Textarea
          id="description"
          rows={4}
          value={groupData.description ?? ''}
          onChange={(e) =>
            setGroupData((g) => ({ ...g, description: e.target.value }))
          }
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="rules">
          {t('groups.form.rules', { defaultValue: 'Rules' })}
        </Label>
        <Textarea
          id="rules"
          rows={4}
          value={groupData.rules ?? ''}
          onChange={(e) =>
            setGroupData((g) => ({ ...g, rules: e.target.value }))
          }
        />
      </div>

      {error && (
        <p className="border-error/40 text-error rounded-md border p-2 text-sm">
          {error}
        </p>
      )}

      <Button
        title="Create group"
        variant="variant-filled-primary"
        action={submit}
        disabled={submitting}
      >
        {submitting
          ? t('common.submitting', { defaultValue: 'Creating…' })
          : t('common.submit', { defaultValue: 'Create group' })}
      </Button>
    </div>
  );
}
