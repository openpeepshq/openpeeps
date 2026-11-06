/**
 * Triggers a browser download for an arbitrary URL. The `download` attribute
 * on <a> is ignored for cross-origin URLs, so the file is fetched and handed
 * to the browser via an object URL; if the fetch fails (e.g. CORS) the URL is
 * opened in a new tab as a fallback.
 */
export const downloadFile = async (url: string, filename?: string) => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    if (filename) anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
  } catch {
    window.open(url, '_blank', 'noopener');
  }
};
