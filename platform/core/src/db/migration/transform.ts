import {
  documentRegistry,
  edgeRegistry,
  parseDocRef,
} from '../pg/map/registry';
import { nowIso } from '../pg/mappers';

const ARANGO_META = ['_id', '_key', '_rev', '_from', '_to'] as const;

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

const timestampsFromModel = (model: Record<string, unknown>) => {
  const ts = nowIso();
  return {
    createdAt: isNonEmptyTimestamp(model.createdAt) ? model.createdAt : ts,
    updatedAt: isNonEmptyTimestamp(model.updatedAt) ? model.updatedAt : ts,
    deletedAt: isNonEmptyTimestamp(model.deletedAt) ? model.deletedAt : null,
  };
};

export const arangoDocToDocumentRow = (
  collection: string,
  doc: Record<string, unknown>,
): Record<string, unknown> => {
  const id = (doc._key ?? doc.id) as string;
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
    return { key: doc._key ?? id, body, createdAt, updatedAt, deletedAt };
  }

  if (collection === 'dataMigrations') {
    const appliedAtRaw =
      (doc.appliedAt as string | undefined) ??
      (model.createdAt as string | undefined);
    return {
      id: doc._key ?? id,
      appliedAt: isNonEmptyTimestamp(appliedAtRaw) ? appliedAtRaw : nowIso(),
    };
  }

  if (collection === 'i18n') {
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
    return { id, locale, namespace, body, createdAt, updatedAt, deletedAt };
  }

  const config = documentRegistry[collection];
  if (!config) {
    throw new Error(`Unknown document collection: ${collection}`);
  }

  const {
    createdAt: _c,
    updatedAt: _u,
    deletedAt: _d,
    id: _id,
    ...data
  } = model;
  const { scalars, body } = config.splitPatch(data);

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
    id: (doc._key ?? doc.id) as string,
    fromId: fromRef.id,
    toId: toRef.id,
    body,
    createdAt,
    updatedAt,
  };
};

export const isEdgeCollection = (collection: string): boolean =>
  collection in edgeRegistry;
