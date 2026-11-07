/**
 * Appends `download=1` so the media endpoint answers with
 * `Content-Disposition: attachment`. The `download` attribute on `<a>` is
 * ignored for cross-origin URLs; the response header works for both.
 */
export const asDownloadUrl = (url: string) =>
  `${url}${url.includes('?') ? '&' : '?'}download=1`;
