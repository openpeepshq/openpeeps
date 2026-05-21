import { z, type ZodTypeAny } from 'zod';

const ZodObjectCtor = z.object({}).constructor as abstract new (
  ...args: never[]
) => z.ZodObject<Record<string, ZodTypeAny>>;
const ZodArrayCtor = z.array(z.string()).constructor as abstract new (
  ...args: never[]
) => z.ZodArray;
const ZodOptionalCtor = z.string().optional().constructor as abstract new (
  ...args: never[]
) => z.ZodOptional<ZodTypeAny>;
const ZodNullableCtor = z.string().nullable().constructor as abstract new (
  ...args: never[]
) => z.ZodNullable<ZodTypeAny>;

/** Zod v4 removed `.deepPartial()`; this mirrors the v3 helper for config documents. */
export const zodDeepPartialSchema = (schema: ZodTypeAny): ZodTypeAny => {
  if (schema instanceof ZodObjectCtor) {
    const shape = schema.shape;
    const partial: Record<string, ZodTypeAny> = {};
    for (const key of Object.keys(shape)) {
      partial[key] = z.optional(zodDeepPartialSchema(shape[key]!));
    }
    return z.object(partial);
  }
  if (schema instanceof ZodArrayCtor) {
    return z.array(zodDeepPartialSchema(schema.element as ZodTypeAny));
  }
  if (schema instanceof ZodOptionalCtor) {
    return z.optional(zodDeepPartialSchema(schema.unwrap()));
  }
  if (schema instanceof ZodNullableCtor) {
    return z.nullable(zodDeepPartialSchema(schema.unwrap()));
  }
  return schema;
};
