import type { ReadableStream } from 'node:stream/web';
import { z, ZodString, type ZodType } from 'zod';
import {
  accessTokenCapabilities,
  accessTokenRelationships,
  profileCapabilities,
  profileRelationships,
  reportCapabilities,
  reportRelationships,
} from './capabilities';
import { postCapabilities } from './capabilities';
import { postRelationships } from './capabilities';

export const passwordPlaceHolder = '*********';

export const password = (sanitize?: boolean) =>
  sanitize
    ? z
        .string()
        .transform(() => passwordPlaceHolder)
        .describe('password')
    : z.string();

export const fixed = <T extends ZodType>(type: T, sanitize?: boolean): T =>
  (sanitize ? type.describe('fixed') : type) as T;

export const hidden = <T extends ZodType>(type: T): T =>
  type.describe('hidden') as T;

export const longText = (type: ZodString) => type.describe('longText');

export const mediaStorageParamsSchema = z.object({
  path: z.string(),
  prefix: z.string(),
  host: z.string().optional(),
});
export type MediaStorageParams = z.infer<typeof mediaStorageParamsSchema>;

export const stripePaymentConfigSchema = (sanitize?: boolean) =>
  z.object({
    paidMembership: z
      .object({
        enabled: z.boolean(),
        productId: z.string().optional(),
        trialPeriodDays: z.number().optional(),
      })
      .optional(),
    publishableKey: password(sanitize).optional(),
    secretKey: password(sanitize).optional(),
    webhookSecret: password(sanitize).optional(),
  });
export type StripePaymentConfig = z.infer<
  ReturnType<typeof stripePaymentConfigSchema>
>;

export const emailConfigSchemaFactory = (sanitize?: boolean) =>
  z.object({
    service: z.string(),
    defaultTemplatePath: z.string(),
    defaultFrom: z.string().optional(),
    transportConfig: z.object({
      host: z.string(),
      port: z.number(),
      secure: z.boolean().default(true),
      // Optional so unauthenticated SMTP (e.g. Mailpit) can omit credentials.
      auth: z
        .object({
          user: z.string().optional(),
          pass: password(sanitize).optional(),
        })
        .optional(),
    }),
  });

export const emailConfigSchema = emailConfigSchemaFactory(false);
export const emailConfigSanitizedSchema = emailConfigSchemaFactory(true);
export type EmailConfig = z.infer<typeof emailConfigSchema>;

export type ConfigValue = string | number | boolean | undefined;
export interface ConfigTree {
  [key: string]:
    | ConfigTree
    | ConfigValue
    | (ConfigTree | undefined)[]
    | (ConfigValue | undefined)[];
}
export type ConfigElement =
  | ConfigTree
  | ConfigValue
  | (ConfigTree | undefined)[]
  | (ConfigValue | undefined)[];
export type ConfigSchemaFactory<T> = (sanitize?: boolean) => ZodType<T>;

export interface ConfigSchema<T> {
  factory: ConfigSchemaFactory<T>;
  defaults: T;
}

export const coreConfigSchemaFactory = (sanitize?: boolean) =>
  z.object({
    version: fixed(z.string(), sanitize),
    environment: fixed(z.string(), sanitize),
    server: z.object({
      host: z.string(),
      signUpsOpen: z.boolean(),
      publicContent: z.boolean(),
      /** Cap on non-deleted profiles; 0 / unset = unlimited. Env-only (not admin-editable). */
      maxProfiles: fixed(z.number().int().nonnegative().optional(), sanitize),
    }),
    db: fixed(
      z.object({
        url: z.string().url(),
        databaseName: z.string().optional(),
        databaseUrl: z.string(),
      }),
      sanitize,
    ),
    redis: fixed(
      z.object({
        host: z.string(),
      }),
      sanitize,
    ),
    email: emailConfigSchemaFactory(sanitize).describe('hidden'),
    logs: fixed(
      z.object({
        local: fixed(
          z.object({
            path: z.string(),
          }),
          sanitize,
        ),
      }),
      sanitize,
    ),
    media: z.object({
      storage: z.object({
        driver: z.enum(['openpeeps']),
        params: mediaStorageParamsSchema,
      }),
    }),
    network: z.object({
      port: z.number(),
    }),
    plugins: z.object({
      path: z.string(),
      rootPackageJsonPath: z.string(),
    }),
    secrets: z.object({
      jwt: password(sanitize),
    }),
    jams: z.object({
      livekit: z.object({
        url: z.string(),
        apiKey: z.string().optional(),
        apiSecret: password(sanitize).optional(),
        recordingEnabled: z.boolean().optional(),
      }),
    }),
    vapid: z.object({
      privateKey: password(sanitize).optional(),
      publicKey: z.string().optional(),
    }),
    federation: z.object({
      active: z.boolean(),
    }),
    activityPub: z.object({
      defaultDomain: z.string(),
      itemsPerPage: z.number(),
      threadDepth: z.number(),
      federation: z.object({
        requestTimeout: z.number(),
      }),
    }),
    sso: z.object({
      generic: z
        .object({
          userProfileRequest: z.object({
            url: z.string(),
            authHeader: z.string().optional(),
          }),
          userProfilePaths: z.object({
            email: z.string(),
            handle: z.string().optional(),
            avatar: z.string().optional(),
            displayName: z.string().optional(),
          }),
          createAccounts: z.boolean().optional(),
          createProfiles: z.boolean().optional(),
        })
        .default({
          userProfileRequest: {
            url: 'https://example.com/profile',
            authHeader: 'Bearer ${token}',
          },
          userProfilePaths: {
            email: '$.data.account.email',
          },
          createAccounts: true,
          createProfiles: true,
        })
        .array(),
      oidc: z
        .object({
          id: z.string(),
          name: z.string(),
          authorizationUrl: z.string(),
          tokenUrl: z.string(),
          userinfoUrl: z.string(),
          jwksUri: z.string().optional(),
          clientId: z.string(),
          clientSecret: password(sanitize).optional(),
          scope: z.string().optional(),
          claimMapping: z
            .object({
              email: z.string().optional(),
              handle: z.string().optional(),
              displayName: z.string().optional(),
              avatar: z.string().optional(),
            })
            .optional(),
          approvalRequired: z.boolean().optional(),
        })
        .default({
          id: 'example-oidc',
          name: 'OIDC Provider',
          authorizationUrl: 'https://example.com/authorize',
          tokenUrl: 'https://example.com/token',
          userinfoUrl: 'https://example.com/userinfo',
          clientId: '',
          scope: 'openid email profile',
          claimMapping: {
            email: 'email',
            handle: 'preferred_username',
            displayName: 'name',
            avatar: 'picture',
          },
          approvalRequired: false,
        })
        .array(),
    }),
    services: z.object({
      sentry: z.object({
        enabled: z.boolean(),
        dsn: z.string().optional(),
        replayEnabled: z.boolean().optional(),
      }),
      location: z.object({
        type: z.string(),
        url: z.string(),
        apiKey: password(sanitize).optional(),
      }),
    }),
    apps: z.object({
      ios: z.object({
        url: z.string().optional(),
        bundleIdentifier: z.string().optional(),
        teamId: z.string().optional(),
        appId: z.string().optional(),
        apnKeyId: z.string().optional(),
        apnSigningKey: longText(z.string()).optional(),
      }),
      android: z.object({
        url: z.string().optional(),
        packageName: z.string().optional(),
        appId: z.string().optional(),
        fcmCredentials: longText(z.string()).optional(),
      }),
    }),
    payments: z.object({
      stripe: stripePaymentConfigSchema(sanitize),
    }),
  });

export const coreConfigSchema = coreConfigSchemaFactory(false);
export const coreConfigSanitizedSchema = coreConfigSchemaFactory(true);
export type CoreConfig = z.infer<typeof coreConfigSchema>;

/** Community-configured member profile fields (`profiles.additionalFields`). */
export const communityProfileAdditionalFieldSchema = z.object({
  // Trim so whitespace-only keys fail the same as "".
  key: z.string().trim().min(1),
  label: z.string(),
  icon: z.string().optional(),
  linkPattern: z.string().optional(),
});
export type CommunityProfileAdditionalField = z.infer<
  typeof communityProfileAdditionalFieldSchema
>;

export const communityConfigSchemaFactory = (_sanitize?: boolean) =>
  z.object({
    theme: z.object({
      base: z.string(),
      icon: z.string().optional(),
      mobileIcon: z.string().optional(),
      primaryHex: z.string(),
      logoFull: z.string().optional(),
      logoSmall: z.string().optional(),
      defaultProfileAvatar: z.string().optional(),
      defaultGroupAvatar: z.string().optional(),
      backgroundAuth: z.string().optional(),
      background: z.string().optional(),
      light: z.object({
        primaryHex: z.string(),
        secondaryHex: z.string().optional(),
        fontFamily: z.string().optional(),
        buttonRadius: z.string().optional(),
        radius: z.string().optional(),
        logoSmall: z.string().optional(),
        defaultProfileAvatar: z.string().optional(),
        defaultGroupAvatar: z.string().optional(),
        backgroundAuth: z.string().optional(),
        background: z.string().optional(),
      }),
      dark: z.object({
        primaryHex: z.string(),
        secondaryHex: z.string().optional(),
        fontFamily: z.string().optional(),
        buttonRadius: z.string().optional(),
        radius: z.string().optional(),
        logoSmall: z.string().optional(),
        defaultProfileAvatar: z.string().optional(),
        defaultGroupAvatar: z.string().optional(),
        backgroundAuth: z.string().optional(),
        background: z.string().optional(),
      }),
    }),
    profiles: z
      .object({
        additionalFields: z
          .array(communityProfileAdditionalFieldSchema)
          .optional(),
      })
      .optional(),
    info: z.object({
      name: z.string(),
      tagLine: z.string(),
      contactEmail: z.string().email().optional(),
      privacyPolicy: z.string().optional(),
      termsAndConditions: z.string().optional(),
    }),
    content: z.object({
      aboutPage: z.string().optional(),
      welcomePage: z.string().optional(),
      codeOfConduct: z.string().optional(),
      welcomeEmail: z.string().optional(),
      pinnedPost: z.string().optional(),
    }),
    settings: z.object({
      openRegistrations: z.boolean(),
      defaultLanguage: z.string().optional(),
    }),
    roles: z.object({
      onRegistration: z.object({
        add: z.string().array(),
        remove: z.string().array(),
      }),
      onEmailValidation: z.object({
        add: z.string().array(),
        remove: z.string().array(),
      }),
    }),
  });
export const communityConfigSchema = communityConfigSchemaFactory(false);
export const communityConfigSanitizedSchema =
  communityConfigSchemaFactory(true);
export type CommunityConfig = z.infer<typeof communityConfigSchema>;

const addWildCardOptions = (
  capabilities: [string, ...string[]],
): [string, ...string[]] => {
  const wildCard = '*';
  const firstLevelCategories = new Set(
    capabilities.map((capability) => capability.split('-')[0]),
  );
  const secondLevelCategories = [...firstLevelCategories].map(
    (flc) =>
      new Set(
        capabilities
          .map((c) => c.split('-'))
          .filter((clist) => clist[0] === flc)
          .map((clist) => `${flc}-${clist[1]}`),
      ),
  );
  return [
    wildCard,
    ...capabilities,
    [...firstLevelCategories].map((flc) => `${flc}-${wildCard}`),
    [...secondLevelCategories].flatMap((slc) => [
      ...slc,
      `${slc.keys().next().value}-${wildCard}`,
    ]),
  ].flat() as [string, ...string[]];
};

export const capabilitiesSchema = z
  .object({
    add: z.string().array().optional(),
    remove: z.string().array().optional(),
  })
  .optional();
export type Capabilities = z.infer<typeof capabilitiesSchema>;

const capabilitiesGroupSchema = <C extends string>(capabilities: [C, ...C[]]) =>
  z
    .object({
      add: z
        .array(z.enum(addWildCardOptions(capabilities)))
        .optional()
        .default([]),
      remove: z
        .array(z.enum(addWildCardOptions(capabilities)))
        .optional()
        .default([]),
    })
    .optional()
    .default({ add: [], remove: [] });

const relationshipsGroupSchema = <
  R extends readonly string[],
  C extends string,
>(
  relationships: R,
  capabilities: [C, ...C[]],
) =>
  z.object(
    Object.fromEntries(
      relationships.map((relationship) => [
        relationship,
        capabilitiesGroupSchema(capabilities),
      ]),
    ),
  );

export const capabilitiesConfigSchema = z.object({
  post: relationshipsGroupSchema(postRelationships, [...postCapabilities]),
  profile: relationshipsGroupSchema(profileRelationships, [
    ...profileCapabilities,
    ...postCapabilities,
  ]),
  report: relationshipsGroupSchema(reportRelationships, [
    ...reportCapabilities,
  ]),
  accessToken: relationshipsGroupSchema(accessTokenRelationships, [
    ...accessTokenCapabilities,
  ]),
});
export const capabilitiesConfigSchemaFactory = (_sanitize?: boolean) =>
  z.object({
    post: relationshipsGroupSchema(postRelationships, [...postCapabilities]),
    profile: relationshipsGroupSchema(profileRelationships, [
      ...profileCapabilities,
      ...postCapabilities,
    ]),
    report: relationshipsGroupSchema(reportRelationships, [
      ...reportCapabilities,
    ]),
    accessToken: relationshipsGroupSchema(accessTokenRelationships, [
      ...accessTokenCapabilities,
    ]),
  });
export type CapabilitiesConfig = z.infer<typeof capabilitiesConfigSchema>;
export type CapabilitiesConfigInput = z.input<typeof capabilitiesConfigSchema>;

export interface MediaStorage {
  store: (data: ArrayBuffer | SharedArrayBuffer) => Promise<string>;
  /**
   * Stream-based variant of {@link MediaStorage.store}. Consumes the given
   * web `ReadableStream`, hashes its bytes while writing them straight to disk,
   * and resolves to the resulting content-addressed key plus the byte count
   * that was actually written. This avoids buffering the full payload in
   * memory before persisting it, which matters for large media uploads.
   *
   * The chunk type is intentionally untyped here: the DOM lib's
   * `ReadableStream<Uint8Array>` and `node:stream/web`'s ditto are
   * structurally identical at runtime but TypeScript treats them as
   * incompatible, so leaving the chunk type open keeps both call sites
   * — `File.stream()` in the request handler and `Readable.fromWeb` in the
   * Node implementation — assignable without explicit casts at the boundary.
   */
  storeStream: (
    stream: ReadableStream,
  ) => Promise<{ key: string; size: number }>;
  getPath: (id: string, filename: string) => string;
  getStream: (id: string) => Promise<ReadableStream>;
  getData: (id: string) => Promise<ArrayBuffer | SharedArrayBuffer>;
  isLocal: () => boolean;
}
