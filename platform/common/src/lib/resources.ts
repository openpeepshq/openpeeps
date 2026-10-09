import type { MediaAttachmentData, ResourceKind } from '../types/models';

export const RESOURCE_KINDS = [
  'video',
  'file',
  'gallery',
  'audio',
  'link',
] as const satisfies readonly ResourceKind[];

export const attachmentMediaKind = (
  att: Pick<MediaAttachmentData, 'type' | 'meta'>,
): 'image' | 'video' | 'audio' | 'file' => {
  const mime = att.meta?.mimetype ?? '';
  const type = att.type ?? '';
  if (type === 'image' || mime.startsWith('image/')) return 'image';
  if (type === 'video' || mime.startsWith('video/')) return 'video';
  if (type === 'audio' || mime.startsWith('audio/')) return 'audio';
  return 'file';
};

export const resourceHasRequiredMedia = (resource: {
  resourceKind: ResourceKind;
  url?: string;
  attachments?: MediaAttachmentData[];
}): boolean => {
  if (resource.resourceKind === 'link') return Boolean(resource.url);
  const need =
    resource.resourceKind === 'gallery'
      ? 'image'
      : resource.resourceKind === 'video'
        ? 'video'
        : resource.resourceKind === 'audio'
          ? 'audio'
          : 'file';
  return (resource.attachments ?? []).some(
    (att) => attachmentMediaKind(att) === need,
  );
};

export type CategoryNode = {
  name: string;
  path: string[];
  children: CategoryNode[];
};

export const categoryTreeFromPaths = (
  paths: readonly (readonly string[])[],
): CategoryNode[] => {
  const root: CategoryNode[] = [];
  for (const path of paths) {
    let level = root;
    const acc: string[] = [];
    for (const name of path) {
      const segment = name.trim();
      if (!segment) continue;
      acc.push(segment);
      let node = level.find((entry) => entry.name === segment);
      if (!node) {
        node = { name: segment, path: [...acc], children: [] };
        level.push(node);
      }
      level = node.children;
    }
  }
  return root;
};

export const pathStartsWith = (
  path: readonly string[],
  prefix: readonly string[],
): boolean =>
  prefix.length <= path.length &&
  prefix.every((segment, index) => path[index] === segment);

export const normalizeResourceTags = (
  tags: readonly string[] | undefined,
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
