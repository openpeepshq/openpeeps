import { Fragment } from 'react';
import { Label } from '@openpeepshq/react-ui';
import { useT } from '../i18n';
import {
  capabilityEditorGroups,
  type CapabilityCellState,
  type CapabilityMatrixOptions,
  type MatrixCapabilities,
  cycleCapabilityCell,
  getCapabilityCellState,
} from '../lib/capabilityMatrix';

export interface CapabilityMatrixColumn {
  key: string;
  label: string;
}

export interface CapabilityMatrixProps {
  /** Editor capability keys (leaves + wildcard allows). */
  editorKeys: readonly string[];
  /** Columns rendered across the matrix (relationships or roles). */
  columns: CapabilityMatrixColumn[];
  value: MatrixCapabilities;
  onChange: (value: MatrixCapabilities) => void;
  /** i18n prefix for title/description/capability/allowAll/stateHint. */
  i18nPrefix: string;
  /** Prefix for cell-state tooltips; defaults to `${i18nPrefix}.state`. */
  stateI18nPrefix?: string;
  /** Column that applies to everyone and cascades; omit to disable cascading. */
  everyoneColumn?: string;
  /** Hide the descriptive help text (matrix used inline). */
  compact?: boolean;
}

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

export function CapabilityMatrix({
  editorKeys,
  columns,
  value,
  onChange,
  i18nPrefix,
  stateI18nPrefix,
  everyoneColumn,
  compact = false,
}: CapabilityMatrixProps) {
  const t = useT();
  const options: CapabilityMatrixOptions = {
    editorKeys,
    columns: columns.map((column) => column.key),
    everyoneColumn,
  };
  const groups = capabilityEditorGroups(editorKeys);
  const statePrefix = stateI18nPrefix ?? `${i18nPrefix}.state`;

  const stateLabel = (state: CapabilityCellState) =>
    t(`${statePrefix}.${state}`, { defaultValue: state });

  const cycleCap = (column: string, cap: string) => {
    onChange(cycleCapabilityCell(options, value, column, cap));
  };

  const CapabilityCell = ({
    column,
    cap,
    subLabel,
  }: {
    column: string;
    cap: string;
    subLabel?: string;
  }) => {
    const state = getCapabilityCellState(options, value, column, cap);
    const locked = state === 'implicit-remove';

    return (
      <button
        type="button"
        disabled={locked}
        aria-label={`${column} ${cap}: ${stateLabel(state)}`}
        title={stateLabel(state)}
        data-testid={`cap-cell-${column}-${cap}`}
        data-cap-state={state}
        className={`mx-auto flex h-7 w-7 flex-col items-center justify-center rounded border text-[0.6rem] font-semibold leading-none ${cellClass[state]}`}
        onClick={() => cycleCap(column, cap)}
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
      {compact ? null : (
        <>
          <Label>
            {t(`${i18nPrefix}.title`, {
              defaultValue: 'Role capabilities',
            })}
          </Label>
          <p className="text-muted-foreground text-sm">
            {t(`${i18nPrefix}.description`, {
              defaultValue:
                'Click a cell to toggle a capability for this relationship.',
            })}
          </p>
          <p className="text-muted-foreground text-xs">
            {t(`${i18nPrefix}.stateHint`, {
              defaultValue:
                'Click a cell to cycle: empty → allow (+) → deny (−). ~ = allowed by a wildcard. × = denied by a wildcard and cannot be changed.',
            })}
          </p>
        </>
      )}
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full table-fixed text-left text-xs">
          <colgroup>
            <col className="w-28" />
            {columns.map((column) => (
              <col key={column.key} />
            ))}
          </colgroup>
          <thead className="bg-surface">
            <tr>
              <th className="p-2 font-medium">
                {t(`${i18nPrefix}.capability`, {
                  defaultValue: 'Capability',
                })}
              </th>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="p-2 text-center font-medium"
                  title={column.label}
                >
                  {column.label}
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
                      {groupLabel || group.wildcard}
                    </td>
                    {columns.map((column) => (
                      <td key={column.key} className="p-2 text-center">
                        <CapabilityCell
                          column={column.key}
                          cap={group.wildcard}
                          subLabel={t(`${i18nPrefix}.allowAll`, {
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
                        {columns.map((column) => (
                          <td key={column.key} className="p-2 text-center">
                            <CapabilityCell column={column.key} cap={cap} />
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
