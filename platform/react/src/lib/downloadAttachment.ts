/**
 * Trigger a browser file download for a media URL. Uses the `download`
 * attribute, which browsers only honor for same-origin URLs — uploaded
 * attachments are always served by this server, so that holds here.
 */
export const downloadAttachment = (url: string, filename?: string) => {
  const anchor = document.createElement('a');
  anchor.href = url;
  if (filename) anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
};
