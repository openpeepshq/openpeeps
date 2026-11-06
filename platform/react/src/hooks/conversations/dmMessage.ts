import type { MediaAttachmentData } from '@openpeepshq/common/types';

/** DM messages are note posts, so their text carries the note budget. */
export const DM_MESSAGE_MAX_LENGTH = 500;
/** Client-side cap on attachments per DM message (applied on both platforms). */
export const DM_MAX_ATTACHMENTS = 4;

/**
 * Send gate for DM messages: nothing in flight, no pending uploads, within
 * the text budget, and something to send (text or attachments).
 */
export const canSendDmMessage = ({
  sending,
  uploadsPending,
  text,
  attachments,
}: {
  sending: boolean;
  uploadsPending: boolean;
  text: string;
  attachments: MediaAttachmentData[];
}) =>
  !sending &&
  !uploadsPending &&
  text.length <= DM_MESSAGE_MAX_LENGTH &&
  (text.trim().length > 0 || attachments.length > 0);
