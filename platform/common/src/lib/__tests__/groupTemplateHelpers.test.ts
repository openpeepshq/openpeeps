import { describe, expect, it } from 'vitest';
import { groupCapabilityTemplates } from '../groupHelpers';
import {
  applySimpleGroupTemplate,
  defaultSimpleGroupTemplate,
  getSimpleGroupTemplateCapabilities,
  groupCapabilitiesMatchTemplate,
  matchSimpleGroupTemplate,
  simpleGroupTemplateOptions,
} from '../groupTemplateHelpers';

describe('groupTemplateHelpers', () => {
  it('matches each simple template by exact capabilities', () => {
    for (const templateId of simpleGroupTemplateOptions(true)) {
      const capabilities = getSimpleGroupTemplateCapabilities(templateId);
      expect(matchSimpleGroupTemplate(capabilities)).toBe(templateId);
    }
  });

  it('returns custom when capabilities diverge from templates', () => {
    const capabilities = applySimpleGroupTemplate('privateGroup');
    capabilities.member = {
      add: [...(capabilities.member?.add ?? []), 'core-groups-join'],
    };
    expect(matchSimpleGroupTemplate(capabilities)).toBe('custom');
  });

  it('treats limitedPostingGroup as announcementGroup', () => {
    expect(
      matchSimpleGroupTemplate(
        groupCapabilityTemplates.limitedPostingGroup.capabilities,
      ),
    ).toBe('announcementGroup');
  });

  it('defaults closed communities to localGroup and open to publicGroup', () => {
    expect(defaultSimpleGroupTemplate(true)).toBe('publicGroup');
    expect(defaultSimpleGroupTemplate(false)).toBe('localGroup');
  });

  it('hides publicGroup from options when community is closed', () => {
    expect(simpleGroupTemplateOptions(false)).not.toContain('publicGroup');
    expect(simpleGroupTemplateOptions(true)).toContain('publicGroup');
  });

  it('applySimpleGroupTemplate clones template capabilities', () => {
    const capabilities = applySimpleGroupTemplate('publicGroup');
    expect(
      groupCapabilitiesMatchTemplate(
        capabilities,
        groupCapabilityTemplates.publicGroup.capabilities,
      ),
    ).toBe(true);
    capabilities.member = { add: ['changed'] };
    expect(
      groupCapabilitiesMatchTemplate(
        applySimpleGroupTemplate('publicGroup'),
        groupCapabilityTemplates.publicGroup.capabilities,
      ),
    ).toBe(true);
  });
});
