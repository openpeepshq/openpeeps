import { z } from 'zod';
import { CommunityConfig } from './config';
import type { i18n, ResourceKey } from 'i18next';

const literalSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.undefined(),
]);
type Literal = z.infer<typeof literalSchema>;
export type Json = Literal | { [key: string]: Json } | Json[];
export const jsonSchema: z.ZodType<Json> = z
  .lazy(() =>
    z.union([literalSchema, z.array(jsonSchema), z.record(z.string(), jsonSchema)]),
  )
  .openapi({ type: 'object' });

export const i18nResourceKeySchema: z.ZodType<ResourceKey> = z
  .lazy(() => z.union([z.string(), z.record(z.string(), i18nResourceKeySchema)]))
  .openapi({ type: 'object' });
export const i18nResourceLanguageSchema = z.record(z.string(), i18nResourceKeySchema);
export const i18nResourceSchema = z.record(z.string(), i18nResourceLanguageSchema);

export const emailAttachmentSchema = z.object({
  filename: z.string(),
  /** Raw string content (e.g. an .ics body). Kept as a string so the options
   *  stay JSON-serializable across the email queue and HTTP render boundary. */
  content: z.string(),
  contentType: z.string().optional(),
});
export type EmailAttachment = z.infer<typeof emailAttachmentSchema>;

export const emailOptionsSchema = z.object({
  to: z.string(),
  template: z.string(),
  locals: z.record(z.string(), jsonSchema).optional(),
  attachments: z.array(emailAttachmentSchema).optional(),
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
