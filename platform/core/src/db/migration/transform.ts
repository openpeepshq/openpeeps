import { access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { join } from 'node:path';
import { groupCapabilityTemplates } from '@openpeepshq/common/lib';
import {
  documentRegistry,
  edgeRegistry,
  parseDocRef,
} from '../pg/map/registry';
import { nowIso } from '../pg/mappers';
import { uuidv7 } from 'uuidv7';
import { readJsonl } from './shared';

const ARANGO_META = ['_id', '_key', '_rev', '_from', '_to'] as const;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Postgres uuid compares case-insensitively; normalize so dedupe matches. */
export const normalizeImportId = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  return UUID_REGEX.test(trimmed) ? trimmed.toLowerCase() : trimmed;
};

export const arangoDocToModel = (
  doc: Record<string, unknown>,
): Record<string, unknown> => {
  const id = (doc._key ?? doc.id) as string;
  const model: Record<string, unknown> = { ...doc, id };
  for (const key of ARANGO_META) {
    delete model[key];
  }
  return model;
};

const isNonEmptyTimestamp = (value: unknown): value is string =>
  typeof value === 'string' && value.trim() !== '';

const resolveDocumentId = (doc: Record<string, unknown>): string => {
  const candidates = [doc.id, doc._key]
    .map((value) => normalizeImportId(value))
    .filter((value): value is string => Boolean(value));

  const uuid = candidates.find((value) => UUID_REGEX.test(value));
  return uuid ?? uuidv7();
};

const timestampsFromModel = (model: Record<string, unknown>) => {
  const ts = nowIso();
  return {
    createdAt: isNonEmptyTimestamp(model.createdAt) ? model.createdAt : ts,
    updatedAt: isNonEmptyTimestamp(model.updatedAt) ? model.updatedAt : ts,
    deletedAt: isNonEmptyTimestamp(model.deletedAt) ? model.deletedAt : null,
  };
};

export type ImportContext = {
  postCreatorIdByPostId?: Map<string, string>;
  /** Empty-name / duplicate-name hashtags: old id → kept id, or '' if dropped. */
  hashtagIdRemap?: Map<string, string>;
};

const entryTypeFromDoc = (doc: Record<string, unknown>) => {
  if (typeof doc.type === 'string') {
    return doc.type;
  }
  const body = doc.body;
  if (body && typeof body === 'object' && 'type' in body) {
    return (body as { type?: unknown }).type;
  }
  return undefined;
};

/** Pre-scan entries edges so legacy posts without creatorId can be imported. */
export const buildPostCreatorIdByPostId = async (
  collectionsDir: string,
): Promise<Map<string, string>> => {
  const map = new Map<string, string>();
  const filePath = join(collectionsDir, 'entries.jsonl');

  try {
    await access(filePath, constants.F_OK);
  } catch {
    return map;
  }

  const docs = await readJsonl(filePath);
  for (const doc of docs) {
    const fromRef = parseDocRef(doc._from as string);
    const toRef = parseDocRef(doc._to as string);
    if (!fromRef || !toRef || toRef.collection !== 'posts') {
      continue;
    }

    const entryType = entryTypeFromDoc(doc);
    const postId = normalizeImportId(toRef.id) ?? toRef.id;
    const creatorId = normalizeImportId(fromRef.id) ?? fromRef.id;
    if (entryType === 'create' || !map.has(postId)) {
      map.set(postId, creatorId);
    }
  }

  return map;
};

/**
 * Legacy Arango groups used discoverable/locked flags; capabilities were added
 * later via an Arango-only data migration that never runs on Postgres restores.
 */
export const capabilitiesFromLegacyGroupFlags = (
  data: Record<string, unknown>,
): Record<string, unknown> | undefined => {
  if (data.capabilities && typeof data.capabilities === 'object') {
    return undefined;
  }
  const discoverable = Boolean(data.discoverable);
  const locked = Boolean(data.locked);
  const { publicGroup, privateGroup, lockedGroup } = groupCapabilityTemplates;
  const template = discoverable
    ? locked
      ? lockedGroup
      : publicGroup
    : privateGroup;
  return template.capabilities as Record<string, unknown>;
};

export const arangoDocToDocumentRow = (
  collection: string,
  doc: Record<string, unknown>,
  context?: ImportContext,
): Record<string, unknown> => {
  const model = arangoDocToModel(doc);
  const { createdAt, updatedAt, deletedAt } = timestampsFromModel(model);

  if (collection === 'configs') {
    const {
      createdAt: _c,
      updatedAt: _u,
      deletedAt: _d,
      id: _id,
      ...body
    } = model;
    const rawKey = String(doc._key ?? doc.id ?? '');
    // Legacy Arango backups used allpeep-* keys; runtime loaders use openpeeps-*.
    const key = rawKey.startsWith('allpeep-')
      ? `openpeeps-${rawKey.slice('allpeep-'.length)}`
      : rawKey;
    return { key, body, createdAt, updatedAt, deletedAt };
  }

  if (collection === 'dataMigrations') {
    const appliedAtRaw =
      (doc.appliedAt as string | undefined) ??
      (model.createdAt as string | undefined);
    return {
      id: doc._key ?? doc.id,
      appliedAt: isNonEmptyTimestamp(appliedAtRaw) ? appliedAtRaw : nowIso(),
    };
  }

  if (collection === 'i18n') {
    const id = resolveDocumentId(doc);
    const locale = (doc.locale ?? doc._key ?? id) as string;
    const namespace = (doc.namespace ?? 'translation') as string;
    const body =
      (doc.body as Record<string, unknown> | undefined) ??
      (doc.translations as Record<string, unknown> | undefined) ??
      (() => {
        const {
          createdAt: _c,
          updatedAt: _u,
          deletedAt: _d,
          id: _id,
          locale: _l,
          namespace: _n,
          translations: _t,
          ...rest
        } = model;
        return rest;
      })();
    return {
      id,
      locale,
      namespace,
      body,
      createdAt,
      updatedAt,
      deletedAt,
    };
  }

  const config = documentRegistry[collection];
  if (!config) {
    throw new Error(`Unknown document collection: ${collection}`);
  }

  const id =
    normalizeImportId(doc._key ?? doc.id) ?? String(doc._key ?? doc.id ?? '');

  const {
    createdAt: _c,
    updatedAt: _u,
    deletedAt: _d,
    id: _id,
    ...data
  } = model;
  const { scalars, body } = config.splitPatch(data);

  if (
    collection === 'posts' &&
    scalars.creatorId === undefined &&
    context?.postCreatorIdByPostId
  ) {
    const creatorId = context.postCreatorIdByPostId.get(id);
    if (creatorId) {
      scalars.creatorId = creatorId;
    }
  }

  if (collection === 'profileSettings' && scalars.profileId === undefined) {
    scalars.profileId = id;
  }

  if (collection === 'notifications' && scalars.profileId === undefined) {
    const actorId = model.actorId ?? model.profileId;
    if (typeof actorId === 'string') {
      scalars.profileId = actorId;
    }
  }

  if (collection === 'groups') {
    const capabilities = capabilitiesFromLegacyGroupFlags(data);
    if (capabilities) {
      body.capabilities = capabilities;
    }
  }

  return {
    id,
    ...scalars,
    body,
    createdAt,
    updatedAt,
    deletedAt,
  };
};

export const arangoDocToEdgeRow = (
  collection: string,
  doc: Record<string, unknown>,
): Record<string, unknown> => {
  const config = edgeRegistry[collection];
  if (!config) {
    throw new Error(`Unknown edge collection: ${collection}`);
  }

  const fromRef = parseDocRef(doc._from as string);
  const toRef = parseDocRef(doc._to as string);
  if (!fromRef || !toRef) {
    throw new Error(
      `Invalid edge refs in ${collection}/${String(doc._key)}: ${String(doc._from)} -> ${String(doc._to)}`,
    );
  }

  const model = arangoDocToModel(doc);
  const { createdAt, updatedAt } = timestampsFromModel(model);
  const { createdAt: _c, updatedAt: _u, id: _id, ...body } = model;

  return {
    id: normalizeImportId(doc._key ?? doc.id) ?? String(doc._key ?? doc.id),
    fromId: normalizeImportId(fromRef.id) ?? fromRef.id,
    toId: normalizeImportId(toRef.id) ?? toRef.id,
    body,
    createdAt,
    updatedAt,
  };
};

export const isEdgeCollection = (collection: string): boolean =>
  collection in edgeRegistry;
