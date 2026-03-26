import { z } from 'zod';

// Schema for app details
const appDetailsSchema = z.object({
  appID: z.string(), // Format: TeamID.BundleID
  paths: z.array(z.string()).optional(), // Array of URL paths that the app can handle
  appIDs: z.array(z.string()).optional(), // Alternative app IDs
  components: z
    .array(
      z.object({
        path: z.string(),
        query: z.record(z.string()).optional(),
        fragment: z.string().optional(),
      }),
    )
    .optional(),
});

// Schema for webcredentials
const webCredentialsSchema = z.object({
  apps: z.array(z.string()), // Array of app IDs that can use web credentials
});

// Schema for activitycontinuation
const activityContinuationSchema = z.object({
  apps: z.array(z.string()), // Array of app IDs that can use activity continuation
});

// Schema for associateddomains
const associatedDomainsSchema = z.object({
  domains: z.array(z.string()), // Array of domains that can use associated domains
});

// Main AASA schema
export const appleAppSiteAssociationSchema = z.object({
  applinks: z
    .object({
      apps: z.array(z.string()).optional(), // Array of app IDs that can use universal links
      details: z.array(appDetailsSchema).optional(), // Array of app details
    })
    .optional(),
  webcredentials: webCredentialsSchema.optional(),
  activitycontinuation: activityContinuationSchema.optional(),
  associateddomains: associatedDomainsSchema.optional(),
});

// Type inference
export type AppleAppSiteAssociation = z.infer<
  typeof appleAppSiteAssociationSchema
>;
export type AppDetails = z.infer<typeof appDetailsSchema>;
export type WebCredentials = z.infer<typeof webCredentialsSchema>;
export type ActivityContinuation = z.infer<typeof activityContinuationSchema>;
export type AssociatedDomains = z.infer<typeof associatedDomainsSchema>;
