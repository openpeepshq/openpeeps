import { z } from 'zod';
import { CommunityConfig } from './config';
import type { i18n, ResourceKey } from 'i18next';

type Literal = string | number | boolean | null | undefined;
export type Json = Literal | { [key: string]: Json } | Json[];
// NOTE: we used to model Json/ResourceKey as `z.lazy(() => z.union([...]))` for
// proper recursive validation. zod 4 + @asteasolutions/zod-to-openapi v8 blow
// the stack when walking such circular schemas during OpenAPI generation
// (isNullableSchema → safeParse(null) → ZodError → JSON.stringify on the
// lazy ref). Since runtime validation of arbitrary JSON is permissive anyway,
// model them as `z.any()` with a stable OpenAPI id and cast the public type.
export const jsonSchema = z
  .any()
  .openapi('JsonValue', { type: 'object' }) as unknown as z.ZodType<Json>;

export const i18nResourceKeySchema = z
  .any()
  .openapi('I18nResourceKey', { type: 'object' }) as unknown as z.ZodType<ResourceKey>;
export const i18nResourceLanguageSchema = z.record(
  z.string(),
  i18nResourceKeySchema,
);
export const i18nResourceSchema = z.record(
  z.string(),
  i18nResourceLanguageSchema,
);

export const emailOptionsSchema = z.object({
  to: z.string(),
  template: z.string(),
  locals: z.record(z.string(), jsonSchema).optional(),
});
export type EmailOptions = z.infer<typeof emailOptionsSchema>;

export const renderedEmailSchema = z.object({
  to: z.string(),
  template: z.string(),
  subject: z.string(),
  html: z.string(),
  text: z.string(),
});
export type RenderedEmail = z.infer<typeof renderedEmailSchema>;

export interface EmailService {
  send: (renderedEmail: EmailOptions) => Promise<void>;
  render: (emailOptions: EmailOptions) => Promise<RenderedEmail>;
}

export interface EmailGlobals {
  communityConfig: CommunityConfig;
  serverData: {
    rootUrl: string;
    iosUrl?: string;
    androidUrl?: string;
  };
  i18nContext: {
    i18n: i18n;
    t: i18n['t'];
  };
}

export interface EmailOptionsWithGlobals extends EmailOptions {
  globals: EmailGlobals;
}

export interface EmailRenderer {
  (
    emailOptions: EmailOptionsWithGlobals & { locals: Record<string, unknown> },
  ): Promise<{ subject: string; html: string }>;
}

export type Level = 'info' | 'warn' | 'error' | 'fatal' | 'debug' | 'trace';

export interface Logger {
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  fatal: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
  trace: (...args: unknown[]) => void;
}

export interface LoggerFactory {
  (ns: string, meta?: Record<string, unknown>): Logger;
}
