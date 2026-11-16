import { useState } from 'react';
import { Pressable, View } from 'react-native';
import type { CategoryNode } from '@openpeepshq/common/lib';
import { categoryPathKey } from '@openpeepshq/common/lib';
import { Input } from '../ui/input';
import { ThemedText } from '../ui/themed-text';
import { useTranslation } from 'react-i18next';

export interface CategoryPathPickerProps {
  path: string[];
  tree: CategoryNode[];
  onChange: (path: string[]) => void;
}

const NodeList = ({
  nodes,
  selected,
  onSelect,
}: {
  nodes: CategoryNode[];
  selected: string[];
  onSelect: (path: string[]) => void;
}) => (
  <View className="ml-3 border-l border-border pl-3">
    {nodes.map((node) => {
      const active =
        selected.length === node.path.length &&
        node.path.every(
          (segment, index) => selected[index] === segment,
        );
      return (
        <View key={categoryPathKey(node.path)} className="py-0.5">
          <Pressable
            onPress={() => onSelect(node.path)}
          >
            <ThemedText
              className={`text-sm ${
                active
                  ? 'font-semibold text-foreground'
                  : 'text-muted-foreground'
              }`}
            >
              {node.name}
            </ThemedText>
          </Pressable>
          {node.children.length ? (
            <NodeList
              nodes={node.children}
              selected={selected}
              onSelect={onSelect}
            />
          ) : null}
        </View>
      );
    })}
  </View>
);

export const CategoryPathPicker = ({
  path,
  tree,
  onChange,
}: CategoryPathPickerProps) => {
  const { t } = useTranslation();
  const [level, setLevel] = useState('');

  return (
    <View className="space-y-2">
      <ThemedText className="text-sm text-muted-foreground">
        {path.length
          ? path.join(' / ')
          : t('resources.form.uncategorized', {
              defaultValue: 'Uncategorized',
            })}
      </ThemedText>
      {tree.length ? (
        <NodeList nodes={tree} selected={path} onSelect={onChange} />
      ) : null}
      <View className="flex-row gap-2">
        <Input
          value={level}
          onChangeText={setLevel}
          placeholder={t('resources.form.addLevel', {
            defaultValue: 'Add a folder',
          })}
        />
        <Pressable
          className="border-border rounded-md border bg-background px-3 py-1.5"
          onPress={() => {
            const name = level.trim();
            if (!name) return;
            onChange([...path, name]);
            setLevel('');
          }}
          accessibilityRole="button"
          accessibilityLabel={t('common.actions.add', {
            defaultValue: 'Add',
          })}
        >
          <ThemedText className="text-sm text-foreground">
            {t('common.actions.add', { defaultValue: 'Add' })}
          </ThemedText>
        </Pressable>
        {path.length ? (
          <Pressable
            className="px-3 py-1.5"
            onPress={() => onChange([])}
            accessibilityRole="button"
            accessibilityLabel={t('resources.form.clearPath', {
              defaultValue: 'Clear',
            })}
          >
            <ThemedText className="text-sm text-muted-foreground">
              {t('resources.form.clearPath', { defaultValue: 'Clear' })}
            </ThemedText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
};
