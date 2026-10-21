import React, { useMemo, useState } from 'react';
import { Pressable, View, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ResourceKind } from '@openpeepshq/common/types';
import { RESOURCE_KINDS } from '@openpeepshq/common/lib';
import type { CategoryNode } from '@openpeepshq/common/lib';
import { useResourceLibrary } from '@openpeepshq/react';
import { MainStackParamList } from '../navigation/types/index';
import { Input } from '../ui/input';
import { LoadingSpinner } from '../ui/loading-spinner';
import { ThemedText } from '../ui/themed-text';
import {
  LayoutGridIcon,
  LayoutListIcon,
  BookmarkIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from '../icons';
import { ResourceCard } from './ResourceCard';

export interface ResourceLibraryProps {
  groupId?: string;
}

const COLLECTION_LIMIT = 5;

const Tree = ({
  nodes,
  selected,
  onSelect,
  counts,
  expanded,
  onToggle,
}: {
  nodes: CategoryNode[];
  selected: string[];
  onSelect: (path: string[]) => void;
  counts: Map<string, number>;
  expanded: Set<string>;
  onToggle: (nodeKey: string) => void;
}) => (
  <View className="gap-y-1">
    {nodes.map((node) => {
      const nodeKey = node.path.join('/');
      const nodeCount = counts.get(nodeKey) ?? 0;
      const isExpanded = expanded.has(nodeKey);
      const isSelected = selected.join('/') === nodeKey;
      const hasChildren = node.children.length > 0;
      return (
        <View key={nodeKey}>
          <View className="flex-row items-center gap-1">
            <Pressable
              onPress={hasChildren ? () => onToggle(nodeKey) : undefined}
              className={hasChildren ? '' : 'invisible'}
            >
              <ChevronRightIcon
                size={16}
                className={`text-muted-foreground transition-transform ${
                  isExpanded ? 'rotate-90' : ''
                }`}
              />
            </Pressable>
            <Pressable onPress={() => onSelect(node.path)}>
              <ThemedText
                className={`text-sm ${
                  isSelected
                    ? 'font-semibold text-foreground'
                    : 'text-muted-foreground'
                }`}
              >
                {node.name}{' '}
                <ThemedText className="text-xs opacity-60">
                  ({nodeCount})
                </ThemedText>
              </ThemedText>
            </Pressable>
          </View>
          {hasChildren && isExpanded ? (
            <View className="ml-4">
              <Tree
                nodes={node.children}
                selected={selected}
                onSelect={onSelect}
                counts={counts}
                expanded={expanded}
                onToggle={onToggle}
              />
            </View>
          ) : null}
        </View>
      );
    })}
  </View>
);

export const ResourceLibrary = ({ groupId }: ResourceLibraryProps) => {
  const { t } = useTranslation();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const library = useResourceLibrary(groupId);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleNode = (nodeKey: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(nodeKey)) next.delete(nodeKey);
      else next.add(nodeKey);
      return next;
    });
  };

  const collectionCounts = useMemo(() => {
    const counts = new Map<string, number>();
    let rootCount = 0;
    for (const post of library.posts) {
      if (post.data?.type !== 'resource') continue;
      const path = post.data.categoryPath;
      if (!path?.length) continue;
      rootCount++;
      for (let i = 1; i <= path.length; i++) {
        const key = path.slice(0, i).join('/');
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
    counts.set('', rootCount);
    return counts;
  }, [library.posts]);

  const treeNodes = useMemo(() => {
    if (library.tree.length === 0) return [];
    return [
      {
        name: t('resources.library.allFolders', {
          defaultValue: 'All folders',
        }),
        path: [] as string[],
        children: library.tree,
      },
    ];
  }, [library.tree, t]);

  const sortedTags = useMemo(
    () =>
      library.tags
        .filter((entry) => library.selectedTags.includes(entry.name))
        .concat(
          library.tags.filter(
            (entry) => !library.selectedTags.includes(entry.name)
          )
        ),
    [library.tags, library.selectedTags]
  );

  const visibleTags = library.tagsOpen
    ? sortedTags
    : sortedTags.slice(0, COLLECTION_LIMIT);
  const hasMoreTags = sortedTags.length > COLLECTION_LIMIT;

  return (
    <View>
      <View className="gap-y-3 p-4">
        <Input
          value={library.search}
          onChangeText={library.setSearch}
          placeholder={t('resources.library.search', {
            defaultValue: 'Search resources',
          })}
        />
        <View className="flex-row flex-wrap items-center justify-between gap-2">
          <View className="flex-row flex-wrap gap-2">
            {(['all', ...RESOURCE_KINDS] as const).map((kind) => (
              <Pressable
                key={kind}
                onPress={() =>
                  library.setKind(
                    kind === 'all' ? 'all' : (kind as ResourceKind)
                  )
                }
                className={`rounded-full px-3 py-1 ${
                  library.kind === kind ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <ThemedText
                  className={
                    library.kind === kind
                      ? 'text-primary-foreground text-xs'
                      : 'text-muted-foreground text-xs'
                  }
                >
                  {kind === 'all'
                    ? t('resources.library.allKinds', { defaultValue: 'All' })
                    : t(`resources.kinds.${kind}`)}
                </ThemedText>
              </Pressable>
            ))}
          </View>
          <View className="flex-row gap-1">
            <Pressable
              onPress={() => library.setView('list')}
              className={`rounded-full p-2 ${
                library.view === 'list' ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <LayoutListIcon
                size={20}
                className={
                  library.view === 'list'
                    ? 'text-primary-foreground'
                    : 'text-muted-foreground'
                }
              />
            </Pressable>
            <Pressable
              onPress={() => library.setView('cards')}
              className={`rounded-full p-2 ${
                library.view === 'cards' ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <LayoutGridIcon
                size={20}
                className={
                  library.view === 'cards'
                    ? 'text-primary-foreground'
                    : 'text-muted-foreground'
                }
              />
            </Pressable>
            <Pressable
              onPress={() => library.setSaved(!library.saved)}
              className={`rounded-full p-2 ${
                library.saved ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <BookmarkIcon
                size={20}
                className={
                  library.saved
                    ? 'text-primary-foreground'
                    : 'text-muted-foreground'
                }
              />
            </Pressable>
          </View>
        </View>

        {/* Breadcrumb + tree */}
        <View>
          <View className="flex-row items-center gap-2">
            <Pressable onPress={() => library.setPathPrefix([])}>
              <ThemedText className="text-sm text-muted-foreground">
                All
              </ThemedText>
            </Pressable>
            {library.pathPrefix.length > 0 ? (
              <>
                <ThemedText className="text-sm text-muted-foreground">
                  /
                </ThemedText>
                <ThemedText className="text-sm text-muted-foreground">
                  {library.pathPrefix.join(' / ')}
                </ThemedText>
              </>
            ) : null}
            <Pressable
              onPress={() => library.setHierarchy(!library.hierarchy)}
              className="ml-auto"
            >
              {library.hierarchy ? (
                <ChevronDownIcon size={20} className="text-muted-foreground" />
              ) : (
                <ChevronRightIcon size={20} className="text-muted-foreground" />
              )}
            </Pressable>
          </View>
          {library.hierarchy && treeNodes.length ? (
            <View className="ml-3 gap-y-1">
              <Tree
                nodes={treeNodes}
                selected={library.pathPrefix}
                onSelect={library.setPathPrefix}
                counts={collectionCounts}
                expanded={expanded}
                onToggle={toggleNode}
              />
            </View>
          ) : null}
        </View>

        {/* Tags (collapsible secondary discovery) */}
        {library.tags.length ? (
          <View className="gap-y-1">
            <View className="flex-row flex-wrap gap-1">
              {visibleTags.map((entry) => {
                const isSelected = library.selectedTags.includes(entry.name);
                return (
                  <Pressable
                    key={entry.name}
                    onPress={() => library.toggleTag(entry.name)}
                    className={`rounded-full px-2 py-0.5 ${
                      isSelected ? 'bg-primary' : 'bg-muted'
                    }`}
                  >
                    <ThemedText className="text-xs">
                      #{entry.name} {entry.count}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
            {hasMoreTags ? (
              <Pressable
                onPress={() => library.setTagsOpen(!library.tagsOpen)}
                className="rounded-full bg-muted px-2 py-0.5"
              >
                <ThemedText className="text-xs text-muted-foreground">
                  {library.tagsOpen
                    ? t('resources.library.hideTags', {
                        defaultValue: 'Hide',
                      })
                    : t('resources.library.showHiddenTags', {
                        defaultValue: '+ {{count}}',
                        count: sortedTags.length - COLLECTION_LIMIT,
                      })}
                </ThemedText>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {/* Resource count */}
        {library.posts.length > 0 ? (
          <ThemedText className="text-xs text-muted-foreground">
            {t('resources.library.resourceCount', {
              defaultValue: 'Showing {{count}} resources',
              count: library.posts.length,
            })}
          </ThemedText>
        ) : null}
      </View>

      {library.query.isLoading ? (
        <View className="h-32 items-center justify-center">
          <LoadingSpinner size="large" />
        </View>
      ) : library.posts.length === 0 ? (
        <ThemedText className="p-8 text-center text-muted-foreground">
          {library.activeFilterCount > 0
            ? t('resources.library.noResults', {
                defaultValue: 'No resources match your filters.',
              })
            : library.pathPrefix.length
              ? t('resources.library.emptyCollection', {
                  defaultValue: 'This collection has no resources yet.',
                })
              : t('resources.library.empty', {
                  defaultValue: 'No resources yet.',
                })}
        </ThemedText>
      ) : library.view === 'list' ? (
        <View className="divide-border">
          {library.posts.map((post) => (
            <Pressable
              key={post.id}
              onPress={() => navigation.navigate('Post', { id: post.id })}
              className="border-b border-border"
            >
              <ResourceCard post={post} layout="list" />
            </Pressable>
          ))}
        </View>
      ) : (
        <ScrollView horizontal={false} contentContainerClassName="gap-4 p-4">
          {library.posts.map((post) => (
            <Pressable
              key={post.id}
              onPress={() => navigation.navigate('Post', { id: post.id })}
            >
              <ResourceCard post={post} layout="card" />
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
};
