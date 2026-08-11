import { useMemo, useState } from 'react';
import { useT, useSetPageHeader, useOpenpeeps } from '../../index';
import {
  Button,
  ExpandableBox,
  Input,
  Label,
  Toast,
  deepGet,
  deepSet,
} from '@openpeepshq/react-ui';

// The admin i18n endpoint is mistyped in the client as the media `Resource`
// type; mirror the Svelte editor and work against the real translation shape.
type TranslationTree = { [key: string]: string | TranslationTree };
type I18nResource = { [language: string]: TranslationTree };
interface I18nData {
  defaults: I18nResource;
  merged: I18nResource;
  overrides: I18nResource;
}

interface LeafProps {
  defaults: I18nResource;
  overrides: I18nResource;
  languages: string[];
  path: string[];
  onChange: (language: string, path: string[], value: string) => void;
}

function LeafEditor({
  defaults,
  overrides,
  languages,
  path,
  onChange,
}: LeafProps) {
  return (
    <ExpandableBox
      initialOpen
      title={<div className="font-bold">{path[path.length - 1]}</div>}
    >
      {languages.map((language) => (
        <Label key={language} title={language} inline>
          <Input
            value={(deepGet(overrides[language], path) as string) ?? ''}
            placeholder={(deepGet(defaults[language], path) as string) ?? ''}
            onChange={(e) => onChange(language, path, e.target.value.trim())}
          />
        </Label>
      ))}
    </ExpandableBox>
  );
}

interface NamespaceProps extends LeafProps {
  merged: I18nResource;
}

function NamespaceEditor({
  defaults,
  merged,
  overrides,
  languages,
  path,
  onChange,
}: NamespaceProps) {
  const current = (
    path.length ? deepGet(merged['en'], path) : merged['en']
  ) as TranslationTree;

  return (
    <ExpandableBox
      initialOpen={path.length === 0}
      title={
        <div className="font-bold">
          {path.length ? path[path.length - 1] : 'AllPeeP Core'}
        </div>
      }
    >
      {Object.entries(current).map(([key, value]) =>
        typeof value === 'string' ? (
          <LeafEditor
            key={key}
            defaults={defaults}
            overrides={overrides}
            languages={languages}
            path={[...path, key]}
            onChange={onChange}
          />
        ) : (
          <NamespaceEditor
            key={key}
            defaults={defaults}
            merged={merged}
            overrides={overrides}
            languages={languages}
            path={[...path, key]}
            onChange={onChange}
          />
        ),
      )}
    </ExpandableBox>
  );
}

export function AdminConfigurationI18n() {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const i18nQuery = openpeepsApi.admin.usei18n();
  const updateI18n = openpeepsApi.admin.updateI18nAction();
  const [overrides, setOverrides] = useState<I18nResource | null>(null);
  const [status, setStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useSetPageHeader(
    t('configuration.i18n.pageTitle', { defaultValue: 'Translations' }),
  );

  const data = i18nQuery.data as unknown as I18nData | undefined;
  const serverOverrides = data?.overrides;

  const effectiveOverrides = useMemo(
    () => (serverOverrides ? structuredClone(serverOverrides) : null),
    [serverOverrides],
  );

  const working = overrides ?? effectiveOverrides;
  const languages = data ? Object.keys(data.merged) : [];

  const onChange = (language: string, path: string[], value: string) => {
    setOverrides((prev) => {
      const next: I18nResource = structuredClone(
        prev ?? effectiveOverrides ?? {},
      );
      deepSet(next, [language, ...path], value || undefined);
      return next;
    });
  };

  const handleSave = async () => {
    if (!working) return;
    setStatus(null);
    try {
      await updateI18n(working as unknown as Parameters<typeof updateI18n>[0]);
      setStatus({
        type: 'success',
        message: t('configuration.i18n.save', { defaultValue: 'Saved' }),
      });
    } catch (err) {
      setStatus({ type: 'error', message: (err as Error).message });
    }
  };

  if (i18nQuery.isLoading || !data || !working) {
    return (
      <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
        {t('common.form.loading', { defaultValue: 'Loading…' })}
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {t('configuration.i18n.pageTitle', { defaultValue: 'Translations' })}
        </h1>
        <Button
          variant="default"
          action={handleSave}
          title={t('configuration.i18n.save', { defaultValue: 'Save' })}
        >
          {t('configuration.i18n.save', { defaultValue: 'Save' })}
        </Button>
      </div>
      {status ? (
        <Toast variant={status.type} onDismiss={() => setStatus(null)}>
          {status.message}
        </Toast>
      ) : null}
      <NamespaceEditor
        defaults={data.defaults}
        merged={data.merged}
        overrides={working}
        languages={languages}
        path={[]}
        onChange={onChange}
      />
    </div>
  );
}
