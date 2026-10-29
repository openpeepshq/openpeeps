import { z } from 'zod';
import {
  RESOURCE_TITLE_MAX_LENGTH,
  visibilityTypeValues,
  type MediaAttachmentData,
  type ResourceKind,
  type VisibilityType,
} from '../types/models';

export { RESOURCE_TITLE_MAX_LENGTH };

/** Matches `resourcePostSchema.url` (`z.url()`), after trimming. */
const resourceUrlSchema = z.url();

export const isValidResourceUrl = (url: string | undefined): boolean => {
  const trimmed = url?.trim() ?? '';
  if (!trimmed) return false;
  return resourceUrlSchema.safeParse(trimmed).success;
};

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
  if (resource.resourceKind === 'link') {
    return isValidResourceUrl(resource.url);
  }
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

export const RESOURCE_FORM_ISSUES = [
  'title',
  'titleLength',
  'url',
  'media',
  'audience',
  'group',
] as const;

export type ResourceFormIssue = (typeof RESOURCE_FORM_ISSUES)[number];

export const resourceFormIssues = (input: {
  title?: string;
  resourceKind: ResourceKind;
  url?: string;
  attachments?: MediaAttachmentData[];
  visibility?: string | null;
  audience?: readonly unknown[] | null;
  groupId?: string | null;
}): ResourceFormIssue[] => {
  const issues: ResourceFormIssue[] = [];
  if (!input.title?.trim()) issues.push('title');
  else if (input.title.length > RESOURCE_TITLE_MAX_LENGTH) {
    issues.push('titleLength');
  }
  if (input.resourceKind === 'link') {
    if (!isValidResourceUrl(input.url)) issues.push('url');
  } else if (!resourceHasRequiredMedia(input)) {
    issues.push('media');
  }
  if (input.visibility === 'direct' && !input.audience?.length) {
    issues.push('audience');
  }
  if (input.visibility === 'group' && !input.groupId) {
    issues.push('group');
  }
  return issues;
};

const isVisibility = (
  value: string | null | undefined,
): value is VisibilityType =>
  !!value && (visibilityTypeValues as readonly string[]).includes(value);

/**
 * Draft visibility the profile may actually post with. A group-only author
 * starts on Specific Group; a single postable group is preselected. Pass
 * `postableGroupIds: null` while memberships are still loading so an existing
 * group choice is not cleared.
 */
export const resourceVisibilityForCapabilities = (input: {
  visibility?: string | null;
  groupId?: string | null;
  allowed: readonly VisibilityType[];
  postableGroupIds: readonly string[] | null;
}): { visibility: VisibilityType; groupId?: string } => {
  const current = isVisibility(input.visibility) ? input.visibility : 'local';
  const fallback = input.allowed[0];
  if (!fallback) {
    return { visibility: current, groupId: input.groupId ?? undefined };
  }

  const keep = input.allowed.includes(current) ? current : fallback;
  if (keep !== 'group') return { visibility: keep };

  if (input.postableGroupIds == null) {
    return { visibility: 'group', groupId: input.groupId ?? undefined };
  }

  const kept =
    input.groupId && input.postableGroupIds.includes(input.groupId)
      ? input.groupId
      : undefined;
  return {
    visibility: 'group',
    groupId:
      kept ??
      (input.postableGroupIds.length === 1
        ? input.postableGroupIds[0]
        : undefined),
  };
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
