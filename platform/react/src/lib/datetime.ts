/**
 * Shared admin date formatting. Mirrors the house style used by the other
 * admin pages (`toLocaleString`) so a given timestamp renders the same on the
 * audit log as on the profile / API-key pages. Falls back to the raw value
 * when it does not parse as a date.
 */
export const formatDateTime = (iso: string): string => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString();
};
