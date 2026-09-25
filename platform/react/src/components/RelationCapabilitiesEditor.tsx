import { useEffect, useMemo, useState } from 'react';
import type { CapabilitiesConfig } from '@openpeepshq/common/types';
import {
  accessTokenCapabilityEditorKeys,
  accessTokenRelationships,
  postCapabilityEditorKeys,
  postRelationships,
  profileCapabilityEditorKeys,
  profileRelationships,
  reportCapabilityEditorKeys,
  reportRelationships,
} from '@openpeepshq/common/types';
import { checkRoleCapabilities } from '@openpeepshq/common/lib';
import { Button, Toast } from '@openpeepshq/react-ui';
import { useT } from '../i18n';
import { useOpenpeeps } from '../contexts/openpeeps';
import { useCurrentProfile } from './layout/IdentityContext';
import { CapabilityMatrix } from './CapabilityMatrix';
import type { CapabilityMatrixColumn } from './CapabilityMatrix';
import type { MatrixCapabilities } from '../lib/capabilityMatrix';
import { diffRelationshipMatrix } from '../lib/capabilityMatrix';

interface RelationObject {
  key: 'post' | 'profile' | 'report' | 'accessToken';
  editorKeys: readonly string[];
  baseRelationships: readonly string[];
  titleI18n: string;
  descriptionI18n: string;
}

const relationObjects: RelationObject[] = [
  {
    key: 'post',
    editorKeys: postCapabilityEditorKeys,
    baseRelationships: postRelationships,
    titleI18n: 'capabilities.relations.post.title',
    descriptionI18n: 'capabilities.relations.post.description',
  },
  {
    key: 'profile',
    editorKeys: profileCapabilityEditorKeys,
    baseRelationships: profileRelationships,
    titleI18n: 'capabilities.relations.profile.title',
    descriptionI18n: 'capabilities.relations.profile.description',
  },
  {
    key: 'report',
    editorKeys: reportCapabilityEditorKeys,
    baseRelationships: reportRelationships,
    titleI18n: 'capabilities.relations.report.title',
    descriptionI18n: 'capabilities.relations.report.description',
  },
  {
    key: 'accessToken',
    editorKeys: accessTokenCapabilityEditorKeys,
    baseRelationships: accessTokenRelationships,
    titleI18n: 'capabilities.relations.accessToken.title',
    descriptionI18n: 'capabilities.relations.accessToken.description',
  },
];

export function RelationCapabilitiesEditor() {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const currentProfile = useCurrentProfile();
  const configQuery = openpeepsApi.admin.useConfigRead(
    'openpeeps',
    'capabilities',
  );
  const updateConfig = openpeepsApi.admin.updateConfigAction({
    namespace: 'openpeeps',
    name: 'capabilities',
  });

  const [draft, setDraft] = useState<CapabilitiesConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const merged = configQuery.data?.config as CapabilitiesConfig | undefined;
  const defaults = configQuery.data?.defaults as CapabilitiesConfig | undefined;

  useEffect(() => {
    if (merged) {
      setDraft(JSON.parse(JSON.stringify(merged)));
    }
  }, [merged]);

  // Sparse patch: only relationship buckets that diverge from the defaults, so
  // saves never persist values identical to the shipped defaults.
  const diffPatch = useMemo<CapabilitiesConfig | null>(() => {
    if (!draft || !defaults) return null;
    const patch: Record<string, Record<string, unknown>> = {};
    for (const obj of relationObjects) {
      const edited = (draft[obj.key] ?? {}) as MatrixCapabilities;
      const df = (defaults[obj.key] ?? {}) as MatrixCapabilities;
      const columns = new Set<string>([
        ...(obj.baseRelationships as readonly string[]),
        ...Object.keys(edited),
        ...Object.keys(df),
      ]);
      const changed = diffRelationshipMatrix(edited, df, [...columns]);
      if (Object.keys(changed).length > 0) {
        patch[obj.key] = changed;
      }
    }
    return Object.keys(patch).length === 0
      ? null
      : (patch as CapabilitiesConfig);
  }, [draft, defaults]);

  const objectColumns = (obj: RelationObject): CapabilityMatrixColumn[] => {
    const rels = new Set<string>(obj.baseRelationships as readonly string[]);
    const draftObj = draft?.[obj.key] ?? {};
    Object.keys(draftObj).forEach((rel) => rels.add(rel));
    return [...rels].map((rel) => ({ key: rel, label: rel }));
  };

  const updateObject = (objKey: string, next: MatrixCapabilities) => {
    setDraft((prev) =>
      prev
        ? ({ ...prev, [objKey]: next } as CapabilitiesConfig)
        : ({ [objKey]: next } as CapabilitiesConfig),
    );
  };

  const canUpdateConfig = checkRoleCapabilities(currentProfile?.roles ?? [], [
    'core-config-update',
  ]).success;

  const handleSave = async () => {
    if (!diffPatch || !canUpdateConfig) return;
    setSaving(true);
    setStatus(null);
    try {
      await updateConfig({ config: diffPatch });
      setStatus({
        type: 'success',
        message: t('capabilities.relations.saveSuccess', {
          defaultValue: 'Relationship capabilities updated',
        }),
      });
      // Capabilities config is consumed by boot-time singletons, so a reload
      // re-initializes the in-memory config the same way AdminConfigEditor does.
      window.location.reload();
    } catch (err) {
      setStatus({ type: 'error', message: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  if (configQuery.isLoading || !draft) {
    return (
      <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
        {t('common.form.loading', { defaultValue: 'Loading…' })}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {relationObjects.map((obj) => (
        <div key={obj.key} className="space-y-2">
          <h3 className="text-lg font-semibold">{t(obj.titleI18n)}</h3>
          <CapabilityMatrix
            editorKeys={[...obj.editorKeys]}
            columns={objectColumns(obj)}
            value={(draft[obj.key] ?? {}) as MatrixCapabilities}
            onChange={(next) => updateObject(obj.key, next)}
            i18nPrefix="capabilities.relations"
            stateI18nPrefix="groups.capabilities.state"
            everyoneColumn="none"
            compact
          />
          <p className="text-muted-foreground text-xs">
            {t(obj.descriptionI18n, {
              defaultValue:
                'Choose what each relationship can do for this object type.',
            })}
          </p>
        </div>
      ))}
      <div className="flex items-center gap-3">
        <Button
          variant="default"
          action={handleSave}
          disabled={saving || !canUpdateConfig || !diffPatch}
          loadingContent={t('common.saving', { defaultValue: 'Saving…' })}
          title={t('common.save', { defaultValue: 'Save' })}
        >
          {saving
            ? t('common.saving', { defaultValue: 'Saving…' })
            : t('common.save', { defaultValue: 'Save' })}
        </Button>
        {!canUpdateConfig ? (
          <span className="text-muted-foreground text-xs">
            {t('capabilities.relations.noUpdateCapability', {
              defaultValue:
                'You can view but not edit relationship capabilities without core-config-update.',
            })}
          </span>
        ) : null}
      </div>
      {status ? (
        <Toast variant={status.type} onDismiss={() => setStatus(null)}>
          {status.message}
        </Toast>
      ) : null}
    </div>
  );
}
