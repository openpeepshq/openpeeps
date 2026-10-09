import { FilePlus } from 'lucide-react';
import type { ResourceKind } from '@openpeepshq/common/types';
import { RESOURCE_KINDS } from '@openpeepshq/common/lib';
import { Button, Input, LoadingSpinner } from '@openpeepshq/react-ui';
import { useT } from '../../i18n';
import { useResourceLibrary } from '../../hooks';
import { FeedPost } from '../post/FeedPost';
import { ResourceCard } from './ResourceCard';
import type { CategoryNode } from '@openpeepshq/common/lib';

export interface ResourceLibraryProps {
  groupId?: string;
  onCreate?: () => void;
  canCreate?: boolean;
}

const Tree = ({
  nodes,
  selected,
  onSelect,
}: {
  nodes: CategoryNode[];
  selected: string[];
  onSelect: (path: string[]) => void;
}) => (
  <ul className="space-y-1">
    {nodes.map((node) => (
      <li key={node.path.join('/')}>
        <button
          type="button"
          className={`text-sm ${
            selected.join('/') === node.path.join('/')
              ? 'font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => onSelect(node.path)}
        >
          {node.name}
        </button>
        {node.children.length ? (
          <div className="ml-3">
            <Tree
              nodes={node.children}
              selected={selected}
              onSelect={onSelect}
            />
          </div>
        ) : null}
      </li>
    ))}
  </ul>
);

export const ResourceLibrary = ({
  groupId,
  onCreate,
  canCreate = false,
}: ResourceLibraryProps) => {
  const t = useT();
  const library = useResourceLibrary(groupId);

  return (
    <div>
      <div className="flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={library.search}
            onChange={(event) => library.setSearch(event.target.value)}
            placeholder={t('resources.library.search', {
              defaultValue: 'Search resources',
            })}
            data-testid="resources-search"
          />
          {canCreate && onCreate ? (
            <Button
              variant="default"
              action={onCreate}
              data-testid="resources-new"
            >
              <FilePlus className="mr-1 size-4" />
              {t('resources.new', { defaultValue: 'New resource' })}
            </Button>
          ) : null}
        </div>
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
          <Button
            compact
            variant={library.hierarchy ? 'default' : 'outline'}
            action={() => library.setHierarchy(!library.hierarchy)}
          >
            {t('resources.library.hierarchy', { defaultValue: 'Hierarchy' })}
          </Button>
        </div>
        {library.tags.length ? (
          <div className="flex flex-wrap gap-1">
            {library.tags.map((entry) => (
              <button
                key={entry.name}
                type="button"
                className={`rounded-full px-2 py-0.5 text-xs ${
                  library.tag === entry.name
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
                onClick={() =>
                  library.setTag(library.tag === entry.name ? null : entry.name)
                }
              >
                #{entry.name} {entry.count}
              </button>
            ))}
          </div>
        ) : null}
        {library.hierarchy ? (
          <div className="border-border rounded-md border p-3">
            <button
              type="button"
              className="text-muted-foreground mb-2 text-sm"
              onClick={() => library.setPathPrefix([])}
            >
              {t('resources.library.allFolders', {
                defaultValue: 'All folders',
              })}
            </button>
            <Tree
              nodes={library.tree}
              selected={library.pathPrefix}
              onSelect={library.setPathPrefix}
            />
          </div>
        ) : null}
      </div>

      {library.query.isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <LoadingSpinner />
        </div>
      ) : library.posts.length === 0 ? (
        <p className="text-muted-foreground p-8 text-center text-sm">
          {t('resources.library.empty', {
            defaultValue: 'No resources yet.',
          })}
        </p>
      ) : (
        library.posts.map((post) => (
          <FeedPost
            key={post.id}
            post={post}
            inGroup={!!groupId}
            content={<ResourceCard post={post} />}
          />
        ))
      )}
    </div>
  );
};
