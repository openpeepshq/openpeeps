/**
 * Regression tests for the ResourceCard download action (list layout).
 *
 * The action used to be enabled with `actionLabel === 'Download'`,
 * comparing the *translated* label against the English copy. In any
 * non-English locale the comparison fails and the download action
 * silently degrades to inert text — resources could no longer be
 * opened/downloaded (issue #1820). The gate must use the stable
 * `resource.resourceKind === 'file'` property, mirroring the web card.
 */

const React = require('react');
const ReactTestRenderer = require('react-test-renderer');

let mockTranslations: Record<string, string> = {};

jest.mock('react-native', () => ({
  View: (props: { children?: unknown }) =>
    React.createElement('View', null, props.children),
  Pressable: (props: {
    children?: unknown;
    onPress?: () => void;
    disabled?: boolean;
  }) =>
    React.createElement(
      'Pressable',
      { onPress: props.onPress, disabled: props.disabled },
      props.children
    ),
  Linking: { openURL: jest.fn() },
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => mockTranslations[key] ?? key,
  }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

jest.mock('@openpeepshq/common/lib', () => {
  // Mirrored from platform/common/src/lib/resources.ts — the built
  // package ships ESM which Jest's node transform doesn't cover.
  const attachmentMediaKind = (att: {
    type?: string;
    meta?: { mimetype?: string };
  }): string => {
    const mime = att.meta?.mimetype ?? '';
    const type = att.type ?? '';
    if (type === 'image' || mime.startsWith('image/')) return 'image';
    if (type === 'video' || mime.startsWith('video/')) return 'video';
    if (type === 'audio' || mime.startsWith('audio/')) return 'audio';
    return 'file';
  };
  const formatSize = (bytes: number): string => `${bytes} B`;
  const normalizeResourceTags = (
    tags: readonly string[] | undefined
  ): string[] => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const raw of tags ?? []) {
      const tag = raw.replace(/^#/, '').trim().toLowerCase();
      if (!tag || seen.has(tag)) continue;
      seen.add(tag);
      out.push(tag);
    }
    return out;
  };
  return {
    attachmentMediaKind,
    formatSize,
    groupName: (group: { name?: string } | null) => group?.name,
    normalizeResourceTags,
  };
});

jest.mock('@openpeepshq/react', () => ({
  useOpenpeeps: () => ({
    openpeepsApi: {
      useCurrentProfile: () => ({ data: null }),
      useCurrentProfileBookmarkedIds: () => ({ data: undefined }),
      bookmarkPostAction: () => () => {},
      unbookmarkPostAction: () => () => {},
    },
  }),
}));

jest.mock('../navigation/helpers', () => ({
  buildGoto: () => jest.fn(),
}));

jest.mock('../custom/common', () => ({
  CachedImage: () => null,
}));

jest.mock('../ui/themed-text', () => ({
  ThemedText: (props: { children?: unknown }) =>
    React.createElement('ThemedText', null, props.children),
}));

jest.mock('../post/VideoPlayOverlay', () => ({
  VideoPlayOverlay: () => null,
}));

jest.mock('../post/TruncatedMarkdown', () => ({
  TruncatedMarkdown: () => null,
}));

jest.mock('../icons', () => ({
  BookmarkPlusIcon: () => React.createElement('BookmarkPlusIcon'),
  BookmarkMinusIcon: () => React.createElement('BookmarkMinusIcon'),
  LinkIcon: () => React.createElement('LinkIcon'),
  ImageOffIcon: () => React.createElement('ImageOffIcon'),
  AudioLinesIcon: () => React.createElement('AudioLinesIcon'),
}));

import type { ResourceCardProps } from './ResourceCard';
import { ResourceCard } from './ResourceCard';

const Linking = require('react-native').Linking;

const EN = {
  'resources.actions.download': 'Download',
  'resources.actions.watch': 'Watch',
  'resources.kinds.file': 'File',
  'resources.kinds.video': 'Video',
};

// German stand-in: the translated label never equals the English copy.
const DE = {
  'resources.actions.download': 'Herunterladen',
  'resources.actions.watch': 'Ansehen',
  'resources.kinds.file': 'Datei',
  'resources.kinds.video': 'Video',
};

const resourcePost = (
  data: Record<string, unknown>
): ResourceCardProps['post'] =>
  ({
    id: 'post-1',
    group: null,
    data: { type: 'resource', ...data },
  }) as unknown as ResourceCardProps['post'];

const filePost = resourcePost({
  title: 'Spec PDF',
  resourceKind: 'file',
  attachments: [
    {
      url: 'https://example.com/spec.pdf',
      type: 'file',
      filename: 'spec.pdf',
      meta: { mimetype: 'application/pdf', size: 1234 },
    },
  ],
});

const videoPost = resourcePost({
  title: 'Talk',
  resourceKind: 'video',
  attachments: [
    {
      url: 'https://example.com/talk.mp4',
      type: 'video',
      meta: { mimetype: 'video/mp4', size: 99 },
    },
  ],
});

const linkPost = resourcePost({
  title: 'Docs',
  resourceKind: 'link',
  url: 'https://example.com/docs',
});

const renderCard = (post: ResourceCardProps['post']) => {
  let tree: ReturnType<typeof ReactTestRenderer.create>;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      React.createElement(ResourceCard, {
        post,
        layout: 'list' as const,
      })
    );
  });
  return tree;
};

// The bookmark button is also a Pressable; it renders disabled for the
// anonymous profile the mock returns, so enabled Pressables are the
// card's actions only.
const enabledPressables = (tree: ReturnType<typeof ReactTestRenderer.create>) =>
  tree.root
    .findAllByType('Pressable')
    .filter((node: { props: { disabled?: boolean } }) => !node.props.disabled);

const actionTexts = (tree: ReturnType<typeof ReactTestRenderer.create>) =>
  tree.root
    .findAllByType('ThemedText')
    .map((node: { props: { children?: unknown } }) => node.props.children);

describe('ResourceCard list-layout actions', () => {
  beforeEach(() => {
    mockTranslations = EN;
    Linking.openURL.mockClear();
  });

  it('enables the download action for a file resource (en locale)', () => {
    const tree = renderCard(filePost);
    const [action] = enabledPressables(tree);
    expect(action).toBeDefined();
    expect(actionTexts(tree)).toContain('Download');
    ReactTestRenderer.act(() => {
      action.props.onPress();
    });
    expect(Linking.openURL).toHaveBeenCalledWith(
      'https://example.com/spec.pdf'
    );
    tree.unmount();
  });

  it('keeps the download action enabled in non-English locales', () => {
    mockTranslations = DE;
    const tree = renderCard(filePost);
    const [action] = enabledPressables(tree);
    expect(action).toBeDefined();
    expect(actionTexts(tree)).toContain('Herunterladen');
    ReactTestRenderer.act(() => {
      action.props.onPress();
    });
    expect(Linking.openURL).toHaveBeenCalledWith(
      'https://example.com/spec.pdf'
    );
    tree.unmount();
  });

  it('renders an inert label for a file resource without an attachment', () => {
    const tree = renderCard(
      resourcePost({ title: 'Empty', resourceKind: 'file' })
    );
    expect(enabledPressables(tree)).toHaveLength(0);
    expect(actionTexts(tree)).toContain('Download');
    tree.unmount();
  });

  it('does not make the watch label pressable for a video resource', () => {
    const tree = renderCard(videoPost);
    expect(enabledPressables(tree)).toHaveLength(0);
    expect(actionTexts(tree)).toContain('Watch');
    tree.unmount();
  });

  it('renders no action for a link resource', () => {
    const tree = renderCard(linkPost);
    expect(enabledPressables(tree)).toHaveLength(0);
    expect(actionTexts(tree)).not.toContain('Download');
    tree.unmount();
  });
});
