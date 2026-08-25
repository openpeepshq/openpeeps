import { Fragment } from 'react';
import type { GroupData, GroupRelationship } from '@openpeepshq/common/types';
import { groupCapabilityEditorRelationships } from '@openpeepshq/common/types';
import { Label } from '@openpeepshq/react-ui';
import { useT } from '../../i18n';
import {
  cycleCapabilityCell,
  getCapabilityCellState,
  groupCapabilityEditorGroups,
  type CapabilityCellState,
} from '../../lib/groupCapabilityMatrix';

export interface GroupCapabilityMatrixProps {
  capabilities: GroupData['capabilities'];
  onChange: (capabilities: GroupData['capabilities']) => void;
}

const relationships = [...groupCapabilityEditorRelationships];

const cellClass: Record<CapabilityCellState, string> = {
  none: 'border-border bg-background hover:bg-surface',
  'implicit-remove':
    'border-error/40 bg-error/15 text-error cursor-not-allowed',
  'implicit-add':
    'border-success/40 bg-success/10 text-success hover:bg-success/20',
  'specific-add':
    'border-success bg-success/25 text-success hover:bg-success/35',
  'specific-remove': 'border-error bg-error/25 text-error hover:bg-error/35',
};

export function GroupCapabilityMatrix({
  capabilities,
  onChange,
}: GroupCapabilityMatrixProps) {
  const t = useT();
  const groups = groupCapabilityEditorGroups();

  const stateLabel = (state: CapabilityCellState) =>
    t(`groups.capabilities.state.${state}`, {
      defaultValue: state,
    });

  const cycleCap = (relationship: GroupRelationship, cap: string) => {
    onChange(cycleCapabilityCell(capabilities, relationship, cap));
  };

  const CapabilityCell = ({
    relationship,
    cap,
    subLabel,
  }: {
    relationship: GroupRelationship;
    cap: string;
    subLabel?: string;
  }) => {
    const state = getCapabilityCellState(capabilities, relationship, cap);
    const locked = state === 'implicit-remove';

    return (
      <button
        type="button"
        disabled={locked}
        aria-label={`${relationship} ${cap}: ${stateLabel(state)}`}
        title={stateLabel(state)}
        data-testid={`cap-cell-${relationship}-${cap}`}
        data-cap-state={state}
        className={`mx-auto flex h-7 w-7 flex-col items-center justify-center rounded border text-[0.6rem] font-semibold leading-none ${cellClass[state]}`}
        onClick={() => cycleCap(relationship, cap)}
      >
        {state === 'implicit-add' ? '~' : null}
        {state === 'specific-add' ? '+' : null}
        {state === 'specific-remove' ? '−' : null}
        {state === 'implicit-remove' ? '×' : null}
        {subLabel ? (
          <span className="text-muted-foreground mt-0.5 text-[0.55rem] font-normal">
            {subLabel}
          </span>
        ) : null}
      </button>
    );
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
            'Choose what each relationship can do. “None” applies to everyone (including signed-in users). “Local” applies only to profiles with the core-local community role. Owner is omitted because owners always have full access.',
        })}
      </p>
      <p className="text-muted-foreground text-xs">
        {t('groups.capabilities.stateHint', {
          defaultValue:
            'Click a cell to cycle: empty → allow (+) → deny (−). ~ = allowed by “All” or by the none column (applies to everyone). × = denied by a wildcard and cannot be changed.',
        })}
      </p>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full table-fixed text-left text-xs">
          <colgroup>
            <col className="w-28" />
            {relationships.map((relationship) => (
              <col key={relationship} />
            ))}
          </colgroup>
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
                  <tr className="bg-surface/60 border-t">
                    <td className="truncate p-2 font-medium" title={groupLabel}>
                      {groupLabel}
                    </td>
                    {relationships.map((relationship) => (
                      <td key={relationship} className="p-2 text-center">
                        <CapabilityCell
                          relationship={relationship}
                          cap={group.wildcard}
                          subLabel={t('groups.capabilities.allowAll', {
                            defaultValue: 'All',
                          })}
                        />
                      </td>
                    ))}
                  </tr>
                  {group.leaves.map((cap) => {
                    const capLabel = cap.startsWith(group.prefix)
                      ? cap.slice(group.prefix.length)
                      : cap;
                    return (
                      <tr key={cap} className="border-t">
                        <td className="truncate p-2 pl-4 font-mono" title={cap}>
                          {capLabel}
                        </td>
                        {relationships.map((relationship) => (
                          <td key={relationship} className="p-2 text-center">
                            <CapabilityCell
                              relationship={relationship}
                              cap={cap}
                            />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
