/**
 * Stored media URLs retain the upload origin. Relativizing storage paths lets
 * browsers resolve them against the host currently serving the application.
 */
export const relativizeStorageUrl = (
  url: string | null | undefined,
): string | undefined => {
  if (!url) return undefined;
  return url.match(/^https?:\/\/[^/]+(\/storage\/.+)$/)?.[1] ?? url;
};
