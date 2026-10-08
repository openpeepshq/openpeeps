import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  capabilityEditorGroups,
  cycleCapabilityCell,
  getCapabilityCellState,
  type CapabilityCellState,
  type CapabilityMatrixOptions,
  type MatrixCapabilities,
} from '@openpeepshq/react';
import { ThemedText } from '~/components/ui/themed-text';
import { cn } from '~/lib/utils';

export interface CapabilityMatrixColumn {
  key: string;
  label: string;
}

export interface CapabilityMatrixProps {
  editorKeys: readonly string[];
  columns: CapabilityMatrixColumn[];
  value: MatrixCapabilities;
  onChange: (value: MatrixCapabilities) => void;
  i18nPrefix: string;
  stateI18nPrefix?: string;
  everyoneColumn?: string;
  compact?: boolean;
  defaultCapabilities?: MatrixCapabilities;
}

const cellClass: Record<CapabilityCellState, string> = {
  'none': 'border-border bg-background',
  'implicit-remove': 'border-destructive/40 bg-destructive/15',
  'implicit-add': 'border-primary/40 bg-primary/10',
  'specific-add': 'border-primary bg-primary/25',
  'specific-remove': 'border-destructive bg-destructive/25',
};

const cellTextClass: Record<CapabilityCellState, string> = {
  'none': 'text-foreground',
  'implicit-remove': 'text-destructive',
  'implicit-add': 'text-primary',
  'specific-add': 'text-primary',
  'specific-remove': 'text-destructive',
};

const cellGlyph: Record<CapabilityCellState, string> = {
  'none': '',
  'implicit-add': '~',
  'specific-add': '+',
  'specific-remove': '−',
  'implicit-remove': '×',
};

const styles = StyleSheet.create({
  label: { width: 112 },
  cell: { width: 44 },
});

export const CapabilityMatrix = ({
  editorKeys,
  columns,
  value,
  onChange,
  i18nPrefix,
  stateI18nPrefix,
  everyoneColumn,
  compact = false,
  defaultCapabilities,
}: CapabilityMatrixProps) => {
  const { t } = useTranslation();
  const options: CapabilityMatrixOptions = {
    editorKeys,
    columns: columns.map((column) => column.key),
    everyoneColumn,
  };
  const groups = capabilityEditorGroups(editorKeys);
  const statePrefix = stateI18nPrefix ?? `${i18nPrefix}.state`;

  const stateLabel = (state: CapabilityCellState) =>
    t(`${statePrefix}.${state}`, { defaultValue: state });

  // A plain render helper (not a nested component) so React keeps the
  // subtree's identity across renders.
  const renderCell = (column: string, cap: string, subLabel?: string) => {
    const state = getCapabilityCellState(options, value, column, cap);
    const locked = state === 'implicit-remove';
    const changed =
      getCapabilityCellState(
        options,
        defaultCapabilities ?? {},
        column,
        cap
      ) !== state;
    return (
      <View key={column} style={styles.cell} className="items-center p-1">
        <Pressable
          disabled={locked}
          accessibilityLabel={`${column} ${cap}: ${stateLabel(state)}`}
          onPress={() =>
            onChange(cycleCapabilityCell(options, value, column, cap))
          }
          className={cn(
            'h-7 w-7 items-center justify-center rounded border',
            cellClass[state],
            changed && 'border-2 border-primary'
          )}
        >
          <ThemedText
            className={cn('text-[10px] font-semibold', cellTextClass[state])}
          >
            {cellGlyph[state]}
          </ThemedText>
          {subLabel ? (
            <ThemedText className="text-muted-foreground text-[8px]">
              {subLabel}
            </ThemedText>
          ) : null}
        </Pressable>
      </View>
    );
  };

  return (
    <View className="gap-y-2 px-1">
      {compact ? null : (
        <>
          <ThemedText className="font-medium">
            {t(`${i18nPrefix}.title`, { defaultValue: 'Role capabilities' })}
          </ThemedText>
          <ThemedText className="text-muted-foreground text-sm">
            {t(`${i18nPrefix}.description`, {
              defaultValue:
                'Click a cell to toggle a capability for this relationship.',
            })}
          </ThemedText>
          <ThemedText className="text-muted-foreground text-xs">
            {t(`${i18nPrefix}.stateHint`, {
              defaultValue:
                'Click a cell to cycle: empty → allow (+) → deny (−). ~ = allowed by a wildcard. × = denied by a wildcard and cannot be changed.',
            })}
          </ThemedText>
        </>
      )}
      <ScrollView horizontal className="rounded-md border border-border">
        <View>
          <View className="flex-row bg-muted items-end">
            <View style={styles.label} className="p-2">
              <ThemedText className="text-xs font-medium">
                {t(`${i18nPrefix}.capability`, { defaultValue: 'Capability' })}
              </ThemedText>
            </View>
            {columns.map((column) => (
              <View
                key={column.key}
                style={styles.cell}
                className="p-1 items-center"
              >
                <ThemedText
                  className="text-[10px] font-medium text-center"
                  numberOfLines={2}
                >
                  {column.label}
                </ThemedText>
              </View>
            ))}
          </View>
          {groups.map((group) => {
            const groupLabel = group.prefix.replace(/-$/, '');
            return (
              <React.Fragment key={group.wildcard}>
                <View className="flex-row items-center border-t border-border bg-muted/60">
                  <View style={styles.label} className="p-2">
                    <ThemedText
                      className="text-xs font-medium"
                      numberOfLines={1}
                    >
                      {groupLabel || group.wildcard}
                    </ThemedText>
                  </View>
                  {columns.map((column) =>
                    renderCell(
                      column.key,
                      group.wildcard,
                      t(`${i18nPrefix}.allowAll`, { defaultValue: 'All' })
                    )
                  )}
                </View>
                {group.leaves.map((cap) => {
                  const capLabel = cap.startsWith(group.prefix)
                    ? cap.slice(group.prefix.length)
                    : cap;
                  return (
                    <View
                      key={cap}
                      className="flex-row items-center border-t border-border"
                    >
                      <View style={styles.label} className="p-2 pl-4">
                        <ThemedText
                          className="text-xs font-mono"
                          numberOfLines={1}
                        >
                          {capLabel}
                        </ThemedText>
                      </View>
                      {columns.map((column) => renderCell(column.key, cap))}
                    </View>
                  );
                })}
              </React.Fragment>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};
