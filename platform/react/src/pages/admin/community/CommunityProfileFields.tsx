import { useEffect, useState } from 'react';
import { MinusSquare, PlusSquare } from 'lucide-react';
import type { CommunityConfig } from '@openpeepshq/common/types';
import { useT, useSetPageHeader, useOpenpeeps } from '../../../index';
import { Button, Input, Label, Toast } from '@openpeepshq/react-ui';

type Field = NonNullable<
  NonNullable<CommunityConfig['profiles']>['additionalFields']
>[number];

export function AdminConfigurationCommunityProfileFields() {
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
  const [fields, setFields] = useState<Field[]>([]);
  const [status, setStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useSetPageHeader(t('configuration.community.profileFields.title'));

  const base = configQuery.data?.config as CommunityConfig | undefined;
  useEffect(() => {
    setFields(structuredClone(base?.profiles?.additionalFields ?? []));
  }, [base]);

  const updateField = (index: number, patch: Partial<Field>) =>
    setFields((prev) =>
      prev.map((f, i) => (i === index ? { ...f, ...patch } : f)),
    );

  const handleSubmit = async () => {
    setStatus(null);
    try {
      await updateConfig({
        config: { profiles: { additionalFields: fields } },
      });
      setStatus({
        type: 'success',
        message: t('configuration.community.updateSuccess'),
      });
    } catch (err) {
      setStatus({ type: 'error', message: (err as Error).message });
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
    <div className="flex flex-col gap-4 p-4">
      <p className="text-sm">{t('configuration.profileFields.description')}</p>
      {fields.map((field, index) => (
        <div key={index} className="flex flex-col gap-2">
          <h4 className="text-lg font-semibold">{index + 1}</h4>
          <Label title={t('profile.form.fields.label')}>
            <Input
              value={field.label}
              onChange={(e) => updateField(index, { label: e.target.value })}
            />
          </Label>
          <Label title={t('common.form.fieldKey')}>
            <Input
              value={field.key}
              onChange={(e) => updateField(index, { key: e.target.value })}
            />
          </Label>
        </div>
      ))}
      {fields.length ? (
        <Button
          variant="outline"
          action={() => setFields((prev) => prev.slice(0, -1))}
          title={t('common.listEditor.removeTitle')}
        >
          <MinusSquare className="mr-1 size-4" />
          {t('common.listEditor.removeTitle')}
        </Button>
      ) : null}
      <Button
        variant="outline"
        action={() => setFields((prev) => [...prev, { key: '', label: '' }])}
        title={t('posts.form.poll.addOption')}
      >
        <PlusSquare className="mr-1 size-4" />
        {t('posts.form.poll.addOption')}
      </Button>
      <Button
        variant="ghost"
        action={handleSubmit}
        title={t('common.form.save')}
      >
        {t('common.form.save')}
      </Button>
      {status ? (
        <Toast variant={status.type} onDismiss={() => setStatus(null)}>
          {status.message}
        </Toast>
      ) : null}
    </div>
  );
}
