import {
  LayoutList,
  LayoutGrid,
  BookmarkIcon,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import type { ResourceKind } from '@openpeepshq/common/types';
import { RESOURCE_KINDS } from '@openpeepshq/common/lib';
import { Button, Input, LoadingSpinner } from '@openpeepshq/react-ui';
import { useMemo, useState } from 'react';
import { useT } from '../../i18n';
import { useHrefOf } from '../../contexts/router';
import { useResourceLibrary } from '../../hooks';
import { ResourceCard } from './ResourceCard';
import type { CategoryNode } from '@openpeepshq/common/lib';

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
  <ul className="space-y-1">
    {nodes.map((node) => {
      const nodeKey = node.path.join('/');
      const nodeCount = counts.get(nodeKey) ?? 0;
      const isExpanded = expanded.has(nodeKey);
      const isSelected = selected.join('/') === nodeKey;
      const hasChildren = node.children.length > 0;
      return (
        <li key={nodeKey}>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className={`text-muted-foreground hover:text-foreground ${
                hasChildren ? '' : 'invisible'
              }`}
              onClick={hasChildren ? () => onToggle(nodeKey) : undefined}
            >
              <ChevronRight
                className={`size-3 transition-transform ${
                  isExpanded ? 'rotate-90' : ''
                }`}
              />
            </button>
            <button
              type="button"
              className={`text-sm ${
                isSelected
                  ? 'font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => onSelect(node.path)}
            >
              {node.name}
              {nodeCount > 0 ? (
                <span className="text-xs opacity-60">({nodeCount})</span>
              ) : null}
            </button>
          </div>
          {hasChildren && isExpanded ? (
            <div className="ml-4">
              <Tree
                nodes={node.children}
                selected={selected}
                onSelect={onSelect}
                counts={counts}
                expanded={expanded}
                onToggle={onToggle}
              />
            </div>
          ) : null}
        </li>
      );
    })}
  </ul>
);

export const ResourceLibrary = ({ groupId }: ResourceLibraryProps) => {
  const t = useT();
  const hrefOf = useHrefOf();
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
            (entry) => !library.selectedTags.includes(entry.name),
          ),
        ),
    [library.tags, library.selectedTags],
  );

  const visibleTags = library.tagsOpen
    ? sortedTags
    : sortedTags.slice(0, COLLECTION_LIMIT);
  const hasMoreTags = sortedTags.length > COLLECTION_LIMIT;

  return (
    <div>
      <div className="flex flex-col gap-3 p-4">
        {/* Search + view toggle */}
        <div className="flex flex-wrap items-center gap-2">
          <Input
            className="flex-1"
            value={library.search}
            onChange={(event) => library.setSearch(event.target.value)}
            placeholder={t('resources.library.search', {
              defaultValue: 'Search resources',
            })}
            data-testid="resources-search"
          />
          <div className="ml-auto flex gap-1">
            <Button
              compact
              size="sm"
              variant={library.view === 'list' ? 'default' : 'outline'}
              action={() => library.setView('list')}
              data-testid="resources-view-list"
              title={t('resources.library.viewList', {
                defaultValue: 'List view',
              })}
            >
              <LayoutList className="size-4" />
            </Button>
            <Button
              compact
              size="sm"
              variant={library.view === 'cards' ? 'default' : 'outline'}
              action={() => library.setView('cards')}
              data-testid="resources-view-cards"
              title={t('resources.library.viewCards', {
                defaultValue: 'Cards view',
              })}
            >
              <LayoutGrid className="size-4" />
            </Button>
            <Button
              compact
              size="sm"
              variant={library.saved ? 'default' : 'outline'}
              action={() => library.setSaved(!library.saved)}
              data-testid="resources-saved"
              title={t('resources.library.saved', { defaultValue: 'Saved' })}
            >
              <BookmarkIcon className="size-4" />
              {t('resources.library.saved', { defaultValue: 'Saved' })}
            </Button>
          </div>
        </div>

        {/* Type filters (format-level) */}
        <div className="flex flex-wrap gap-2">
          <Button
            compact
            variant={library.kind === 'all' ? 'default' : 'outline'}
            action={() => library.setKind('all')}
          >
            {t('resources.library.allKinds', { defaultValue: 'All' })}
          </Button>
          {RESOURCE_KINDS.map((kind) => (
            <Button
              key={kind}
              compact
              variant={library.kind === kind ? 'default' : 'outline'}
              action={() => library.setKind(kind as ResourceKind)}
            >
              {t(`resources.kinds.${kind}`, { defaultValue: kind })}
            </Button>
          ))}
        </div>

        {/* Breadcrumb + tree */}
        <div>
          <div className="flex items-center gap-2 text-sm">
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => library.setPathPrefix([])}
            >
              All
            </button>
            {library.pathPrefix.length > 0 ? (
              <>
                <span className="text-muted-foreground">/</span>
                <span className="text-muted-foreground">
                  {library.pathPrefix.join(' / ')}
                </span>
              </>
            ) : null}
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground ml-auto"
              onClick={() => library.setHierarchy(!library.hierarchy)}
            >
              {library.hierarchy ? (
                <ChevronDown className="size-4" />
              ) : (
                <ChevronRight className="size-4" />
              )}
            </button>
          </div>
          {library.hierarchy ? (
            <div className="border-border mt-2 rounded-md border p-3">
              {treeNodes.length ? (
                <Tree
                  nodes={treeNodes}
                  selected={library.pathPrefix}
                  onSelect={library.setPathPrefix}
                  counts={collectionCounts}
                  expanded={expanded}
                  onToggle={toggleNode}
                />
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Tags (collapsible secondary discovery) */}
        {library.tags.length ? (
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap gap-1">
              {visibleTags.map((entry) => {
                const isSelected = library.selectedTags.includes(entry.name);
                return (
                  <button
                    key={entry.name}
                    type="button"
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      isSelected
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                    onClick={() => library.toggleTag(entry.name)}
                  >
                    #{entry.name} {entry.count}
                  </button>
                );
              })}
            </div>
            {hasMoreTags ? (
              <button
                type="button"
                className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs"
                onClick={() => library.setTagsOpen(!library.tagsOpen)}
              >
                {library.tagsOpen
                  ? t('resources.library.hideTags', {
                      defaultValue: 'Hide',
                    })
                  : t('resources.library.showHiddenTags', {
                      defaultValue: '+ {{count}}',
                      count: sortedTags.length - COLLECTION_LIMIT,
                    })}
              </button>
            ) : null}
          </div>
        ) : null}

        {/* Resource count */}
        {library.posts.length > 0 ? (
          <p className="text-muted-foreground text-xs">
            {t('resources.library.resourceCount', {
              defaultValue: 'Showing {{count}} resources',
              count: library.posts.length,
            })}
          </p>
        ) : null}
      </div>

      {library.query.isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <LoadingSpinner />
        </div>
      ) : library.posts.length === 0 ? (
        <p className="text-muted-foreground p-8 text-center text-sm">
          {library.activeFilterCount > 0
            ? t('resources.library.noResults', {
                defaultValue: 'No resources match your current filters.',
              })
            : library.pathPrefix.length
              ? t('resources.library.emptyCollection', {
                  defaultValue: 'This collection has no resources yet.',
                })
              : t('resources.library.empty', {
                  defaultValue: 'No resources yet.',
                })}
        </p>
      ) : library.view === 'list' ? (
        <div className="divide-border flex flex-col divide-y">
          {library.posts.map((post) => (
            <a
              key={post.id}
              href={hrefOf({ type: 'post', id: post.id })}
              className="block"
            >
              <ResourceCard post={post} layout="list" inGroup={!!groupId} />
            </a>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {library.posts.map((post) => (
            <a
              key={post.id}
              href={hrefOf({ type: 'post', id: post.id })}
              className="block"
            >
              <ResourceCard post={post} layout="card" inGroup={!!groupId} />
            </a>
          ))}
        </div>
      )}
    </div>
  );
};
