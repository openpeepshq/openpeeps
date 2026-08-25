import type { GroupData } from '../types';
import { groupCapabilityTemplates } from './groupHelpers';

export const simpleGroupTemplateIds = [
  'publicGroup',
  'localGroup',
  'privateGroup',
  'announcementGroup',
  'lockedGroup',
] as const;

export type SimpleGroupTemplateId = (typeof simpleGroupTemplateIds)[number];

export type GroupTemplateSelection = SimpleGroupTemplateId | 'custom';

type GroupCapabilities = GroupData['capabilities'];

const TEMPLATE_RELATIONSHIPS = [
  'none',
  'local',
  'member',
  'moderator',
  'admin',
  'owner',
] as const;

const normalizeBucket = (bucket?: { add?: string[]; remove?: string[] }) => ({
  add: [...(bucket?.add ?? [])].sort(),
  remove: [...(bucket?.remove ?? [])].sort(),
});

export const normalizeGroupCapabilitiesForMatch = (
  capabilities: GroupCapabilities | undefined,
): Record<string, { add: string[]; remove: string[] }> => {
  const normalized: Record<string, { add: string[]; remove: string[] }> = {};
  for (const relationship of TEMPLATE_RELATIONSHIPS) {
    const bucket = capabilities?.[relationship];
    if (!bucket?.add?.length && !bucket?.remove?.length) continue;
    normalized[relationship] = normalizeBucket(bucket);
  }
  return normalized;
};

export const groupCapabilitiesMatchTemplate = (
  capabilities: GroupCapabilities | undefined,
  templateCapabilities: GroupCapabilities,
) =>
  JSON.stringify(normalizeGroupCapabilitiesForMatch(capabilities)) ===
  JSON.stringify(normalizeGroupCapabilitiesForMatch(templateCapabilities));

export const getSimpleGroupTemplateCapabilities = (
  templateId: SimpleGroupTemplateId,
): GroupCapabilities => {
  const template = groupCapabilityTemplates[templateId];
  return structuredClone(template.capabilities);
};

export const matchSimpleGroupTemplate = (
  capabilities: GroupCapabilities | undefined,
): GroupTemplateSelection => {
  for (const templateId of simpleGroupTemplateIds) {
    if (
      groupCapabilitiesMatchTemplate(
        capabilities,
        groupCapabilityTemplates[templateId].capabilities,
      )
    ) {
      return templateId;
    }
  }
  return 'custom';
};

export const applySimpleGroupTemplate = (
  templateId: SimpleGroupTemplateId,
): GroupCapabilities => getSimpleGroupTemplateCapabilities(templateId);

export const defaultSimpleGroupTemplate = (
  publicContent: boolean,
): SimpleGroupTemplateId => (publicContent ? 'publicGroup' : 'localGroup');

export const simpleGroupTemplateOptions = (publicContent: boolean) =>
  simpleGroupTemplateIds.filter((id) => publicContent || id !== 'publicGroup');
