import React from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { ResourceKind } from '@openpeepshq/common/types';
import { RESOURCE_KINDS } from '@openpeepshq/common/lib';
import { useResourceLibrary } from '@openpeepshq/react';
import { FeedPost } from '~/components/post/FeedPost';
import { Input } from '~/components/ui/input';
import { ThemedText } from '~/components/ui/themed-text';
import { ResourceCard } from './ResourceCard';

export interface ResourceLibraryProps {
  groupId?: string;
}

export const ResourceLibrary = ({ groupId }: ResourceLibraryProps) => {
  const { t } = useTranslation();
  const library = useResourceLibrary(groupId);

  return (
    <View>
      <View className="gap-y-3 p-4">
        <Input
          value={library.search}
          onChangeText={library.setSearch}
          placeholder={t('resources.library.search')}
        />
        <View className="flex-row flex-wrap gap-2">
          {(['all', ...RESOURCE_KINDS] as const).map((kind) => (
            <Pressable
              key={kind}
              onPress={() =>
                library.setKind(kind === 'all' ? 'all' : (kind as ResourceKind))
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
                  ? t('resources.library.allKinds')
                  : t(`resources.kinds.${kind}`)}
              </ThemedText>
            </Pressable>
          ))}
        </View>
        {library.tags.length ? (
          <View className="flex-row flex-wrap gap-1">
            {library.tags.map((entry) => (
              <Pressable
                key={entry.name}
                onPress={() =>
                  library.setTag(library.tag === entry.name ? null : entry.name)
                }
                className={`rounded-full px-2 py-0.5 ${
                  library.tag === entry.name ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <ThemedText className="text-xs">
                  #{entry.name} {entry.count}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        ) : null}
        {library.tree.length ? (
          <View className="gap-y-1">
            <Pressable onPress={() => library.setPathPrefix([])}>
              <ThemedText className="text-sm text-muted-foreground">
                {t('resources.library.allFolders')}
              </ThemedText>
            </Pressable>
            {library.tree.map((node) => (
              <Pressable
                key={node.path.join('/')}
                onPress={() => library.setPathPrefix(node.path)}
              >
                <ThemedText
                  className={
                    library.pathPrefix.join('/') === node.path.join('/')
                      ? 'font-semibold'
                      : 'text-muted-foreground'
                  }
                >
                  {node.name}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
      {library.posts.length === 0 ? (
        <ThemedText className="p-8 text-center text-muted-foreground">
          {t('resources.library.empty')}
        </ThemedText>
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
    </View>
  );
};
