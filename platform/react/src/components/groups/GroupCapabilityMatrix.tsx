import { Fragment } from 'react';
import type { GroupData, GroupRelationship } from '@openpeepshq/common/types';
import { groupCapabilityEditorRelationships } from '@openpeepshq/common/types';
import { Label } from '@openpeepshq/react-ui';
import { useT } from '../../i18n';
import {
  groupCapabilityEditorGroups,
  hasExplicitCap,
  isCoveredByWildcard,
  isEffectivelyGranted,
  toggleRelationshipCapability,
} from '../../lib/groupCapabilityMatrix';

export interface GroupCapabilityMatrixProps {
  capabilities: GroupData['capabilities'];
  onChange: (capabilities: GroupData['capabilities']) => void;
}

const relationships = [...groupCapabilityEditorRelationships];

export function GroupCapabilityMatrix({
  capabilities,
  onChange,
}: GroupCapabilityMatrixProps) {
  const t = useT();
  const groups = groupCapabilityEditorGroups();

  const toggleCap = (relationship: GroupRelationship, cap: string) => {
    onChange(toggleRelationshipCapability(capabilities, relationship, cap));
  };

  return (
    <div className="space-y-2 px-1">
      <Label>
        {t('groups.capabilities.title', {
          defaultValue: 'Role capabilities',
        })}
      </Label>
      <p className="text-muted-foreground text-sm">
        {t('groups.capabilities.description', {
          defaultValue:
            'Choose what each relationship can do. Includes people who are not members (none / local). Owner is omitted because owners always have full access.',
        })}
      </p>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[40rem] text-left text-xs">
          <thead className="bg-surface">
            <tr>
              <th className="p-2 font-medium">
                {t('groups.capabilities.capability', {
                  defaultValue: 'Capability',
                })}
              </th>
              {relationships.map((relationship) => (
                <th key={relationship} className="p-2 text-center font-medium">
                  {t(`groups.roles.${relationship}`, {
                    defaultValue: relationship,
                  })}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => {
              const groupLabel = group.prefix.replace(/-$/, '');
              return (
                <Fragment key={group.wildcard}>
                  <tr className="border-t bg-surface/60">
                    <td className="p-2 font-medium">{groupLabel}</td>
                    {relationships.map((relationship) => {
                      const checked = hasExplicitCap(
                        capabilities,
                        relationship,
                        group.wildcard,
                      );
                      return (
                        <td key={relationship} className="p-2 text-center">
                          <label className="inline-flex flex-col items-center gap-0.5">
                            <input
                              type="checkbox"
                              aria-label={`${relationship} ${group.wildcard}`}
                              checked={checked}
                              onChange={() =>
                                toggleCap(relationship, group.wildcard)
                              }
                            />
                            <span className="text-muted-foreground text-[0.65rem] font-normal">
                              {t('groups.capabilities.allowAll', {
                                defaultValue: 'All',
                              })}
                            </span>
                          </label>
                        </td>
                      );
                    })}
                  </tr>
                  {group.leaves.map((cap) => (
                    <tr key={cap} className="border-t">
                      <td className="p-2 pl-6 font-mono">{cap}</td>
                      {relationships.map((relationship) => {
                        const covered = isCoveredByWildcard(
                          capabilities,
                          relationship,
                          cap,
                        );
                        const checked = isEffectivelyGranted(
                          capabilities,
                          relationship,
                          cap,
                        );
                        // Covered leaves stay enabled so remove exclusions
                        // (e.g. events-only admin) stay editable and sync with simple.
                        return (
                          <td key={relationship} className="p-2 text-center">
                            <input
                              type="checkbox"
                              aria-label={`${relationship} ${cap}`}
                              checked={checked}
                              title={
                                covered && checked
                                  ? t('groups.capabilities.coveredByWildcard', {
                                      defaultValue:
                                        'Granted by allow-all; uncheck to exclude',
                                    })
                                  : undefined
                              }
                              onChange={() => toggleCap(relationship, cap)}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
