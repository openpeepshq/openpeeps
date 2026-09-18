import { z, type ZodTypeAny } from 'zod';
import { passwordPlaceHolder } from '@openpeepshq/common/types';

const ZodObjectCtor = z.object({}).constructor as abstract new (
  ...args: never[]
) => z.ZodObject<Record<string, ZodTypeAny>>;
const ZodArrayCtor = z.array(z.string()).constructor as abstract new (
  ...args: never[]
) => z.ZodArray;

type SchemaWithDef = ZodTypeAny & {
  def?: { type?: string; innerType?: ZodTypeAny; in?: ZodTypeAny };
  in?: ZodTypeAny;
  unwrap?: () => ZodTypeAny;
  removeDefault?: () => ZodTypeAny;
};

/** Mirrors the frontend's config-form `unwrap()` (peel optional/default/etc.). */
const unwrap = (schema: ZodTypeAny): ZodTypeAny => {
  const s = schema as SchemaWithDef;
  switch (s.def?.type) {
    case 'optional':
    case 'nullable':
      return unwrap(s.unwrap!());
    case 'default':
      return unwrap(s.removeDefault!());
    case 'pipe':
      return unwrap((s.in ?? s.def?.in)!);
    case 'readonly':
    case 'catch':
    case 'prefault':
      return unwrap(s.def!.innerType!);
  }
  return schema;
};

/**
 * `.describe('password')` is set on the schema node it's called directly
 * on — for `password()` fields that's the `.transform()` pipe node, which
 * `unwrap()` would otherwise peel straight through on its way to the
 * underlying string. Check the description at every layer while peeling,
 * not just on the fully-unwrapped result.
 */
const isPasswordField = (schema: ZodTypeAny): boolean => {
  let current: ZodTypeAny | undefined = schema;
  while (current) {
    if (current.description === 'password') return true;
    const s = current as SchemaWithDef;
    switch (s.def?.type) {
      case 'optional':
      case 'nullable':
        current = s.unwrap?.();
        continue;
      case 'default':
        current = s.removeDefault?.();
        continue;
      case 'pipe':
        current = s.in ?? s.def?.in;
        continue;
      case 'readonly':
      case 'catch':
      case 'prefault':
        current = s.def?.innerType;
        continue;
      default:
        return false;
    }
  }
  return false;
};

/**
 * Admin config PATCHes originate from a form pre-filled with the sanitized
 * GET response, so any password field the admin didn't retype still holds
 * the literal placeholder string. Left alone, `updateConfigValues` would
 * persist that placeholder as the "real" secret, permanently destroying it
 * (arrays are replaced wholesale, so this also hits every sibling entry in
 * an array the admin only partially edited, e.g. adding a second SSO
 * provider). This walks `schema` alongside `existing` (the previously
 * stored raw config) and `incoming` (the patch), restoring the existing
 * value wherever a password-described field's incoming value is exactly
 * the placeholder.
 */
export const restorePasswordPlaceholders = (
  schema: ZodTypeAny,
  existing: unknown,
  incoming: unknown,
): unknown => {
  if (isPasswordField(schema)) {
    return incoming === passwordPlaceHolder ? existing : incoming;
  }

  const unwrapped = unwrap(schema);

  if (unwrapped instanceof ZodObjectCtor) {
    if (typeof incoming !== 'object' || incoming === null || Array.isArray(incoming)) {
      return incoming;
    }
    const shape = unwrapped.shape;
    const existingObj = (existing ?? {}) as Record<string, unknown>;
    const incomingObj = incoming as Record<string, unknown>;
    const result: Record<string, unknown> = { ...incomingObj };
    for (const key of Object.keys(incomingObj)) {
      const fieldSchema = shape[key];
      if (!fieldSchema) continue;
      result[key] = restorePasswordPlaceholders(
        fieldSchema,
        existingObj[key],
        incomingObj[key],
      );
    }
    return result;
  }

  if (unwrapped instanceof ZodArrayCtor) {
    if (!Array.isArray(incoming)) return incoming;
    const existingArr = Array.isArray(existing) ? existing : [];
    const elementSchema = unwrapped.element as ZodTypeAny;
    return incoming.map((item, i) =>
      restorePasswordPlaceholders(elementSchema, existingArr[i], item),
    );
  }

  return incoming;
};
